import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateStyleProfile } from '@/lib/claude/client'

const X_API_BASE = 'https://api.x.com/2'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: { x_account_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.x_account_id) {
    return NextResponse.json({ error: 'アカウントIDは必須です' }, { status: 400 })
  }

  // x_account_id の所有権確認
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id, user_id, x_user_id, access_token')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Xアカウントが見つからないか、アクセス権限がありません' }, { status: 403 })
  }

  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN が設定されていません' }, { status: 500 })
  }

  // X API でツイート取得（最大100件）
  const timelineUrl = `${X_API_BASE}/users/${account.x_user_id}/tweets?max_results=100&tweet.fields=id,text,created_at`
  const xResponse = await fetch(timelineUrl, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  })

  if (!xResponse.ok) {
    const errData = await xResponse.json().catch(() => ({}))
    console.error('X API error:', xResponse.status, errData)
    return NextResponse.json({ error: 'タイムラインの取得に失敗しました' }, { status: 422 })
  }

  const xData = await xResponse.json()
  const tweets: Array<{ id: string; text: string }> = xData.data ?? []

  // lib/claude/client.ts の関数でプロファイル生成
  try {
    const profileData = await generateStyleProfile(tweets.map(t => t.text))

    // style_profiles に保存
    const { data: savedProfile } = await supabase
      .from('style_profiles')
      .upsert(
        { x_account_id: body.x_account_id, profile_data: profileData, model_version: 'claude-sonnet-4-6', analyzed_at: new Date().toISOString() },
        { onConflict: 'x_account_id' }
      )

    return NextResponse.json({ profile: savedProfile ?? profileData })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
