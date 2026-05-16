import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !team) {
    return NextResponse.json({ error: 'チームが見つかりません' }, { status: 404 })
  }

  return NextResponse.json(team)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ownerのみ更新可
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'オーナーのみ変更できます' }, { status: 403 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : undefined

  if (!name || name.length === 0) {
    return NextResponse.json({ error: 'チーム名は必須です' }, { status: 400 })
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'チーム名は100文字以内で指定してください' }, { status: 400 })
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !team) {
    console.error('[teams/[id]] patch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(team)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ownerのみ削除可
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'オーナーのみ削除できます' }, { status: 403 })
  }

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[teams/[id]] delete error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
