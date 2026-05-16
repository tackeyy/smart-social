import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('auto_plug_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[auto-plug/rules] fetch error:', error)
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
    threshold_type?: string
    threshold_value?: number
    template_text?: string
    max_executions?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.x_account_id) {
    return NextResponse.json({ error: 'x_account_id は必須です' }, { status: 400 })
  }
  if (!body.threshold_type || !['likes', 'retweets', 'replies'].includes(body.threshold_type)) {
    return NextResponse.json({ error: 'threshold_type は likes/retweets/replies のいずれかです' }, { status: 400 })
  }
  if (!body.threshold_value || body.threshold_value < 10) {
    return NextResponse.json({ error: 'threshold_value は10以上の整数で指定してください' }, { status: 400 })
  }
  if (!body.template_text || body.template_text.trim().length === 0) {
    return NextResponse.json({ error: 'template_text は必須です' }, { status: 400 })
  }
  if (body.template_text.length > 280) {
    return NextResponse.json({ error: 'template_text は280文字以内です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('auto_plug_rules')
    .insert({
      user_id: user.id,
      x_account_id: body.x_account_id,
      threshold_type: body.threshold_type,
      threshold_value: body.threshold_value,
      template_text: body.template_text.trim(),
      max_executions: body.max_executions ?? 1,
    })
    .select()
    .single()

  if (error) {
    console.error('[auto-plug/rules] insert error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
