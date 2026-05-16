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

  if (!body.source_tweet_id || !body.source_tweet_text) {
    return NextResponse.json(
      { error: 'source_tweet_id と source_tweet_text は必須です' },
      { status: 400 }
    )
  }

  // 3候補を ai_candidates JSONB 配列に格納し、1レコードで管理
  const { data, error } = await supabase
    .from('drafts')
    .insert({
      user_id: user.id,
      x_account_id: body.x_account_id,
      type: 'reply',
      content: '',  // 候補選択時に更新
      source_tweet_id: body.source_tweet_id,
      source_tweet_text: body.source_tweet_text,
      ai_candidates: body.draft_candidates ?? [],
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
