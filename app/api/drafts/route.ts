import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // drafts テーブルに user_id があるため直接フィルタできる（RLS + user_id 直接チェック）
  let query = supabase
    .from('drafts')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'reply')

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[drafts/route] fetch error:', error)
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const type = (body.type as string) === 'reply' ? 'reply' : 'post'

  // x_account_id の所有確認（未指定の場合はユーザーの先頭アカウントを使用）
  let xAccountId = body.x_account_id as string | undefined
  if (xAccountId) {
    const { data: account } = await supabase
      .from('x_accounts')
      .select('id')
      .eq('id', xAccountId)
      .eq('user_id', user.id)
      .single()
    if (!account) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }
  } else {
    const { data: account } = await supabase
      .from('x_accounts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (!account) {
      return NextResponse.json({ error: 'X account not connected' }, { status: 404 })
    }
    xAccountId = account.id
  }

  if (type === 'reply') {
    if (!body.source_tweet_id || !body.source_tweet_text) {
      return NextResponse.json(
        { error: 'source_tweet_id と source_tweet_text は必須です' },
        { status: 400 }
      )
    }
    const { data, error } = await supabase
      .from('drafts')
      .insert({
        user_id: user.id,
        x_account_id: xAccountId,
        type: 'reply',
        content: '',
        source_tweet_id: body.source_tweet_id,
        source_tweet_text: body.source_tweet_text,
        ai_candidates: body.draft_candidates ?? [],
        status: 'pending',
      })
      .select()
      .single()
    if (error) {
      console.error('[drafts/route] insert error:', error)
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  }

  // type === 'post'（スケジュール投稿など通常投稿用）
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) {
    return NextResponse.json({ error: 'content は必須です' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      user_id: user.id,
      x_account_id: xAccountId,
      type: 'post',
      content,
      status: 'pending',
    })
    .select()
    .single()
  if (error) {
    console.error('[drafts/route] insert error:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
