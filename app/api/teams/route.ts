import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('teams(*)')
    .eq('user_id', user.id)

  if (error) {
    console.error('[teams] fetch error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  const teams = (data ?? []).map((row: any) => row.teams).filter(Boolean)
  return NextResponse.json(teams)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  if (name.length === 0) {
    return NextResponse.json({ error: 'チーム名は必須です' }, { status: 400 })
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'チーム名は100文字以内で指定してください' }, { status: 400 })
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, created_by: user.id })
    .select()
    .single()

  if (teamError || !team) {
    console.error('[teams] insert error:', teamError)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('[teams] member insert error:', memberError)
    // 補償トランザクション: team_members INSERT失敗時はteamsレコードを削除してロールバック
    await supabase.from('teams').delete().eq('id', team.id)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(team, { status: 201 })
}
