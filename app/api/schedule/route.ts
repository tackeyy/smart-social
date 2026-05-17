import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserPlan, getPlanLimits } from '@/lib/subscription'

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
    console.error('[schedule/route] fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: { draft_id?: string; scheduled_at?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.draft_id) {
    return NextResponse.json({ error: 'draft_id は必須です' }, { status: 400 })
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at は必須です' }, { status: 400 })
  }
  // scheduled_at のバリデーション（typeof + isNaN の2重防御）
  if (typeof body.scheduled_at !== 'string') {
    return NextResponse.json({ error: 'scheduled_at は文字列で指定してください' }, { status: 400 })
  }
  const scheduledAt = new Date(body.scheduled_at)
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return NextResponse.json({ error: '過去の日時は指定できません' }, { status: 400 })
  }

  // プラン取得 → Free プランのみ月次スケジュール投稿数チェック
  const plan = await getUserPlan(supabase, user.id)
  const scheduledLimit = getPlanLimits(plan).scheduledPostsPerMonth
  if (isFinite(scheduledLimit)) {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const { count: scheduledCount, error: countError } = await supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'posted'])
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', startOfMonth.toISOString())

    if (countError) {
      console.error('[gating] count query failed:', countError)
      return NextResponse.json({ error: 'サービスが一時的に利用できません' }, { status: 503 })
    }
    if ((scheduledCount ?? 0) >= scheduledLimit) {
      return NextResponse.json(
        { error: '今月のスケジュール投稿数の上限に達しました', upgrade_required: true },
        { status: 402 }
      )
    }
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
    console.error('[schedule/route] update error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'ドラフトが見つかりません' }, { status: 404 })
  }

  return NextResponse.json(data, { status: 201 })
}
