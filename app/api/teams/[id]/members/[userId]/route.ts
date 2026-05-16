import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TeamRole } from '@/types/app'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ownerのみ役割変更可
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'オーナーのみ役割を変更できます' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const role = body.role as string | undefined

  if (!role || !['owner', 'admin', 'member'].includes(role)) {
    return NextResponse.json(
      { error: 'role は owner / admin / member のいずれかを指定してください' },
      { status: 400 }
    )
  }

  const { data: updated, error } = await supabase
    .from('team_members')
    .update({ role: role as TeamRole })
    .eq('team_id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !updated) {
    console.error('[teams/[id]/members/[userId]] patch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 自分自身の退会 OR owner/adminによる除名
  const isSelf = user.id === userId

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  if (!isSelf && !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'オーナーまたは管理者のみメンバーを除名できます' }, { status: 403 })
  }

  // ownerが0人にならないよう防御
  if (isSelf && membership.role === 'owner') {
    const { data: owners } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', id)
      .eq('role', 'owner')

    if (!owners || owners.length <= 1) {
      return NextResponse.json(
        { error: 'オーナーが1人のときは退会できません。先に他のメンバーをオーナーに変更してください' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[teams/[id]/members/[userId]] delete error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
