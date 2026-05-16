import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postTweet } from '@/lib/x/client'
import { runEvergreen } from '@/lib/evergreen/scheduler'

// Vercel Cron から毎分呼び出される
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  // タイミング攻撃対策: timingSafeEqual で定数時間比較
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/scheduler] CRON_SECRET is not configured')
    return NextResponse.json({ error: '設定エラー' }, { status: 500 })
  }
  const incoming = authHeader?.replace('Bearer ', '') ?? ''
  const isValid = incoming.length > 0 &&
    incoming.length === secret.length &&
    timingSafeEqual(Buffer.from(incoming), Buffer.from(secret))

  if (!isValid) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // drafts テーブルから status='scheduled' かつ scheduled_at が到達済みの行をアトミックに
  // 'processing' へ更新し、返ってきた行のみ処理する（Vercel Cron 二重実行による二重投稿防止）
  const { data: posts, error } = await supabase
    .from('drafts')
    .update({ status: 'processing' })
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .lt('retry_count', 3)
    .in('type', ['original', 'thread'])
    .select('*')

  if (error) {
    console.error('Cron scheduler error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  const results: Array<{ id: string; status: string }> = []

  for (const post of posts ?? []) {
    // drafts テーブルに統合済みのため content を直接参照
    const text = post.content ?? ''
    try {
      const tweet = await postTweet({ text })

      const { error: updateError } = await supabase
        .from('drafts')
        .update({
          status: 'posted',
          posted_tweet_id: tweet.id,
          posted_at: new Date().toISOString(),
          last_error: null,  // 成功時は前回のエラーメッセージをクリア
        })
        .eq('id', post.id)

      if (updateError) {
        console.error('Tweet posted but DB update failed:', {
          tweetId: tweet.id,
          postId: post.id,
          error: updateError,
        })
        // processing のままデッドロックを避けるため scheduled に戻す
        await supabase
          .from('drafts')
          .update({ status: 'scheduled', last_error: 'DB sync failed after tweet posted' })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'failed' })
        continue
      }

      results.push({ id: post.id, status: 'posted' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const currentCount = post.retry_count ?? 0
      const newCount = currentCount + 1
      const newStatus = newCount >= 3 ? 'failed' : 'scheduled'
      await supabase
        .from('drafts')
        .update({ retry_count: newCount, last_error: message, status: newStatus })
        .eq('id', post.id)
      results.push({ id: post.id, status: newStatus })
    }
  }

  // Auto-plug チェック（テーブルが未作成の場合はスキップ）
  let autoPlugResults: Array<{ rule_id: string; tweet_id: string; status: string }> = []
  try {
    autoPlugResults = await runAutoPlug(supabase)
  } catch (err) {
    // auto_plug_rules テーブルが未作成等の場合はサイレントスキップ
    console.warn('[cron/scheduler] auto-plug skipped:', err instanceof Error ? err.message : err)
  }

  // Evergreen 再投稿チェック（テーブルが未作成の場合はスキップ）
  let evergreenResults: Array<{ rule_id: string; status: string }> = []
  try {
    evergreenResults = await runEvergreen(supabase)
  } catch (err) {
    console.warn('[cron/scheduler] evergreen skipped:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({
    processed: results.length,
    results,
    auto_plug: autoPlugResults,
    evergreen: evergreenResults,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runAutoPlug(supabase: any): Promise<Array<{ rule_id: string; tweet_id: string; status: string }>> {
  const { data: rules, error: rulesError } = await supabase
    .from('auto_plug_rules')
    .select('*, x_accounts(access_token, access_token_secret)')
    .eq('enabled', true)

  if (rulesError) throw rulesError
  if (!rules || rules.length === 0) return []

  // 直近24時間の投稿済みツイートのメトリクスを確認
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const plugResults: Array<{ rule_id: string; tweet_id: string; status: string }> = []

  for (const rule of rules) {
    try {
      // 投稿済みドラフトを取得
      const { data: drafts } = await supabase
        .from('drafts')
        .select('id, posted_tweet_id, user_id')
        .eq('status', 'posted')
        .eq('user_id', rule.user_id)
        .gte('posted_at', since24h)
        .not('posted_tweet_id', 'is', null)
        .limit(10)

      for (const draft of drafts ?? []) {
        if (!draft.posted_tweet_id) continue

        // 既に実行済みかチェック
        const { data: existing } = await supabase
          .from('auto_plug_executions')
          .select('id')
          .eq('rule_id', rule.id)
          .eq('source_tweet_id', draft.posted_tweet_id)
          .single()

        if (existing) continue

        // 実行回数チェック
        const { count: execCount } = await supabase
          .from('auto_plug_executions')
          .select('*', { count: 'exact', head: true })
          .eq('rule_id', rule.id)

        if ((execCount ?? 0) >= rule.max_executions) continue

        // X APIでメトリクス取得
        const bearerToken = process.env.X_BEARER_TOKEN
        if (!bearerToken) continue

        const metricsRes = await fetch(
          `https://api.x.com/2/tweets/${draft.posted_tweet_id}?tweet.fields=public_metrics`,
          { headers: { Authorization: `Bearer ${bearerToken}` } }
        )
        if (!metricsRes.ok) continue

        const metricsData = await metricsRes.json()
        const metrics = metricsData?.data?.public_metrics
        if (!metrics) continue

        const metricValue = {
          likes: metrics.like_count,
          retweets: metrics.retweet_count,
          replies: metrics.reply_count,
        }[rule.threshold_type as 'likes' | 'retweets' | 'replies'] ?? 0

        if (metricValue < rule.threshold_value) continue

        // 閾値超過 → auto-plugリプライを投稿
        const xAccount = Array.isArray(rule.x_accounts) ? rule.x_accounts[0] : rule.x_accounts
        const tweet = await postTweet(
          { text: rule.template_text, replyToId: draft.posted_tweet_id },
          xAccount
            ? { access_token: xAccount.access_token, access_token_secret: xAccount.access_token_secret }
            : undefined
        )

        // 実行記録を保存
        await supabase.from('auto_plug_executions').insert({
          rule_id: rule.id,
          source_tweet_id: draft.posted_tweet_id,
          reply_tweet_id: tweet.id,
        })

        plugResults.push({ rule_id: rule.id, tweet_id: draft.posted_tweet_id, status: 'executed' })
      }
    } catch (err) {
      console.error('[auto-plug] rule execution error:', { ruleId: rule.id, error: err })
      plugResults.push({ rule_id: rule.id, tweet_id: '', status: 'error' })
    }
  }

  return plugResults
}
