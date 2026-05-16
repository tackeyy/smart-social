import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // reply_drafts は x_account_id 経由でユーザーに紐づくため、
  // ユーザーが所有する x_account_ids を先に取得して IN 句で絞る
  const { data: accounts } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('user_id', user.id)

  const accountIds = accounts?.map(a => a.id) ?? []

  let query = supabase
    .from('reply_drafts')
    .select('*')
    .in('x_account_id', accountIds)

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

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

  // x_account_id がログインユーザーのものか確認してから INSERT
  const { data: account } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('reply_drafts')
    .insert({
      x_account_id: body.x_account_id,
      user_id: user.id,
      source_tweet_id: body.source_tweet_id,
      source_tweet_text: body.source_tweet_text,
      draft_candidates: body.draft_candidates ?? [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
