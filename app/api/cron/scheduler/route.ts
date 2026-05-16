import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postTweet } from '@/lib/x/client'

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

  return NextResponse.json({ processed: results.length, results })
}
