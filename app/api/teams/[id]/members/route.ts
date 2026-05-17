import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getUserPlan, getPlanLimits, canUseFeature } from '@/lib/subscription'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // メンバーシップ確認
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, user_id, role, invited_by, joined_at')
    .eq('team_id', id)

  if (error) {
    console.error('[teams/[id]/members] fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: { email?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.email || body.email.trim().length === 0) {
    return NextResponse.json({ error: 'email は必須です' }, { status: 400 })
  }

  // メンバーシップ確認（owner/adminのみ招待可）
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'オーナーまたは管理者のみ招待できます' }, { status: 403 })
  }

  // プラン取得 → team-members featureチェック → チームメンバー数上限チェック
  const plan = await getUserPlan(supabase, user.id)
  if (!canUseFeature(plan, 'team-members')) {
    return NextResponse.json(
      { error: 'チームメンバー機能はBusinessプラン以上でご利用いただけます', upgrade_required: true },
      { status: 402 }
    )
  }
  const memberLimit = getPlanLimits(plan).teamMembers
  if (isFinite(memberLimit)) {
    const { count: memberCount, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', id)

    if (countError) {
      console.error('[gating] count query failed:', countError)
      return NextResponse.json({ error: 'サービスが一時的に利用できません' }, { status: 503 })
    }
    if ((memberCount ?? 0) >= memberLimit) {
      return NextResponse.json(
        { error: 'チームメンバー数の上限に達しました', upgrade_required: true },
        { status: 402 }
      )
    }
  }

  // email でユーザーを検索（service_role key 使用）
  // TODO: ユーザー数が増えた場合は auth.users を直接クエリするRPCに置き換えること
  const adminClient = getAdminClient()
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  })

  if (listError) {
    console.error('[teams/[id]/members] list users error:', listError)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  const emailLower = (body.email as string).trim().toLowerCase()
  const targetUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === emailLower
  )
  if (!targetUser) {
    return NextResponse.json({ error: '指定されたメールアドレスのユーザーが見つかりません' }, { status: 404 })
  }

  // 招待者のroleに応じて付与可能なroleを制限（adminはownerを付与できない）
  const allowedRoles = membership.role === 'owner'
    ? ['owner', 'admin', 'member']
    : ['admin', 'member']

  if (body.role && !allowedRoles.includes(body.role)) {
    return NextResponse.json({ error: '指定された役割を付与する権限がありません' }, { status: 403 })
  }
  const role = body.role ?? 'member'

  const { data: newMember, error: insertError } = await supabase
    .from('team_members')
    .insert({
      team_id: id,
      user_id: targetUser.id,
      role,
      invited_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    // unique constraint violation: すでにメンバーとして登録済み
    if (insertError.code === '23505') {
      return NextResponse.json({ error: '指定されたユーザーはすでにチームのメンバーです' }, { status: 409 })
    }
    console.error('[teams/[id]/members] insert error:', insertError)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(newMember, { status: 201 })
}
