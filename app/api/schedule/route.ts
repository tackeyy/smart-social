import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // scheduled_posts は廃止。drafts テーブルから scheduled_at が設定済みのレコードを返す
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['scheduled', 'posted', 'failed'])
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.draft_id) {
    return NextResponse.json({ error: 'draft_id は必須です' }, { status: 400 })
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at は必須です' }, { status: 400 })
  }
  const scheduledAt = new Date(body.scheduled_at)
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return NextResponse.json({ error: '過去の日時は指定できません' }, { status: 400 })
  }

  // scheduled_posts への INSERT ではなく、既存の drafts レコードに scheduled_at をセット
  const { data, error } = await supabase
    .from('drafts')
    .update({ scheduled_at: body.scheduled_at, status: 'scheduled' })
    .eq('id', body.draft_id)
    .eq('user_id', user.id)  // 所有権確認
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'ドラフトが見つかりません' }, { status: 404 })
  }

  return NextResponse.json(data, { status: 201 })
}
