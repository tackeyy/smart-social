import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('evergreen_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[evergreen/rules] fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: {
    x_account_id?: number
    source_tweet_id?: string
    source_content?: string
    prefix_pool?: string[]
    interval_days?: number
    max_runs?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.x_account_id) {
    return NextResponse.json({ error: 'x_account_id は必須です' }, { status: 400 })
  }
  if (!body.source_tweet_id || body.source_tweet_id.trim().length === 0) {
    return NextResponse.json({ error: 'source_tweet_id は必須です' }, { status: 400 })
  }
  if (!body.source_content || body.source_content.trim().length === 0) {
    return NextResponse.json({ error: 'source_content は必須です' }, { status: 400 })
  }
  if (body.source_content.length > 280) {
    return NextResponse.json({ error: 'source_content は280文字以内です' }, { status: 400 })
  }

  const intervalDays = body.interval_days ?? 30
  if (intervalDays < 7 || intervalDays > 365) {
    return NextResponse.json({ error: 'interval_days は7〜365の範囲で指定してください' }, { status: 400 })
  }

  // next_run_at を interval_days 後に設定
  const nextRunAt = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('evergreen_rules')
    .insert({
      user_id: user.id,
      x_account_id: body.x_account_id,
      source_tweet_id: body.source_tweet_id.trim(),
      source_content: body.source_content.trim(),
      prefix_pool: body.prefix_pool ?? [],
      interval_days: intervalDays,
      max_runs: body.max_runs ?? null,
      next_run_at: nextRunAt,
    })
    .select()
    .single()

  if (error) {
    console.error('[evergreen/rules] insert error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
