import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { postTweet } from '@/lib/x/client'

// Vercel Cron から毎分呼び出される
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, drafts(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const post of posts ?? []) {
    const text = post.drafts?.content ?? ''
    try {
      const tweet = await postTweet({ text })
      await supabase
        .from('scheduled_posts')
        .update({ status: 'posted', posted_tweet_id: tweet.id, posted_at: new Date().toISOString() })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'posted' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const currentCount = post.retry_count ?? 0
      const newCount = currentCount + 1
      const newStatus = newCount >= 3 ? 'failed' : post.status
      await supabase
        .from('scheduled_posts')
        .update({ retry_count: newCount, last_error: message, status: newStatus })
        .eq('id', post.id)
      results.push({ id: post.id, status: newStatus, error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
