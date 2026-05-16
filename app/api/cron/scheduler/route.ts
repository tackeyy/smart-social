import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

  // 投稿予定時刻を過ぎた pending な投稿を取得
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*, drafts(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Phase 2 で X API 投稿処理を実装
  const results = posts?.map((post) => ({ id: post.id, status: 'skipped' })) ?? []

  return NextResponse.json({ processed: results.length, results })
}
