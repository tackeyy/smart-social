import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('x_accounts')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('[GET /api/accounts]', error)
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }
  const { screen_name, x_user_id } = body as Record<string, unknown>

  if (!screen_name || !x_user_id) {
    return NextResponse.json({ error: 'ユーザー名とUser IDは必須です' }, { status: 400 })
  }

  if (typeof screen_name !== 'string') {
    return NextResponse.json({ error: 'ユーザー名は文字列で入力してください' }, { status: 400 })
  }

  if (!screen_name.trim()) {
    return NextResponse.json({ error: 'ユーザー名を入力してください' }, { status: 400 })
  }

  if (!/^[A-Za-z0-9_]{1,50}$/.test(screen_name as string)) {
    return NextResponse.json(
      { error: 'ユーザー名は半角英数字とアンダースコアのみ使用できます（50文字以内）' },
      { status: 400 }
    )
  }

  if (!/^\d+$/.test(x_user_id as string)) {
    return NextResponse.json({ error: 'User IDは数値で入力してください' }, { status: 400 })
  }

  const access_token = process.env.X_ACCESS_TOKEN ?? ''
  const access_token_secret = process.env.X_ACCESS_TOKEN_SECRET ?? ''

  const { data, error } = await supabase
    .from('x_accounts')
    .insert({ user_id: user.id, screen_name, x_user_id, access_token, access_token_secret })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/accounts]', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'このXアカウントはすでに登録されています' }, { status: 409 })
    }
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
