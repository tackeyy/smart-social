import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserPlan, getPlanLimits, canUseFeature } from '@/lib/subscription'

export async function GET(_request: Request) {
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

  // x_account_id の所有権チェック（プラン制限チェックより前に実施）
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()
  if (accountError || !account) {
    return NextResponse.json({ error: 'Xアカウントが見つかりません' }, { status: 403 })
  }

  // プラン取得 → Auto-plug ルール数上限チェック
  const plan = await getUserPlan(supabase, user.id)
  if (!canUseFeature(plan, 'auto-plug')) {
    return NextResponse.json(
      { error: 'Auto-plug機能はProプラン以上でご利用いただけます', upgrade_required: true },
      { status: 402 }
    )
  }
  const autoPlugLimit = getPlanLimits(plan).autoPlugRules
  if (isFinite(autoPlugLimit)) {
    const { count: ruleCount, error: countError } = await supabase
      .from('auto_plug_rules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('[gating] count query failed:', countError)
      return NextResponse.json({ error: 'サービスが一時的に利用できません' }, { status: 503 })
    }
    if ((ruleCount ?? 0) >= autoPlugLimit) {
      return NextResponse.json(
        { error: '連携できるAuto-plugルール数の上限に達しました', upgrade_required: true },
        { status: 402 }
      )
    }
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
