import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postTweet } from '@/lib/x/client'

// Vercel Cron から毎分呼び出される
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  // タイミング攻撃対策: timingSafeEqual で定数時間比較
  const secret = process.env.CRON_SECRET ?? ''
  const incoming = authHeader?.replace('Bearer ', '') ?? ''
  const isValid = incoming.length > 0 &&
    incoming.length === secret.length &&
    timingSafeEqual(Buffer.from(incoming), Buffer.from(secret))

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // アトミックに status='pending' → 'processing' へ更新し、
  // 返ってきた行のみ処理する（Vercel Cron 二重実行による二重投稿防止）
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'processing' })
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .lt('retry_count', 3)
    .select('*, drafts(*)')

  if (error) {
    console.error('Cron scheduler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const post of posts ?? []) {
    const text = post.drafts?.content ?? ''
    try {
      const tweet = await postTweet({ text })

      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({ status: 'posted', posted_tweet_id: tweet.id, posted_at: new Date().toISOString() })
        .eq('id', post.id)

      if (updateError) {
        console.error('Tweet posted but DB update failed:', {
          tweetId: tweet.id,
          postId: post.id,
          error: updateError,
        })
        // processing のままデッドロックを避けるため pending に戻す
        await supabase
          .from('scheduled_posts')
          .update({ status: 'pending', last_error: 'DB sync failed after tweet posted' })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'failed' })
        continue
      }

      results.push({ id: post.id, status: 'posted' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const currentCount = post.retry_count ?? 0
      const newCount = currentCount + 1
      const newStatus = newCount >= 3 ? 'failed' : 'pending'
      await supabase
        .from('scheduled_posts')
        .update({ retry_count: newCount, last_error: message, status: newStatus })
        .eq('id', post.id)
      results.push({ id: post.id, status: newStatus, error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
