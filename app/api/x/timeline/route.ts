import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const X_API_BASE = 'https://api.x.com/2'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const url = new URL(request.url)

  // x_account_id クエリパラメータ対応（省略時は先頭アカウントを使用）
  const xAccountId = url.searchParams.get('x_account_id')
  let accountQuery = supabase.from('x_accounts').select('id, x_user_id, access_token').eq('user_id', user.id)
  if (xAccountId) accountQuery = accountQuery.eq('id', xAccountId)
  const { data: accounts } = await accountQuery

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'X account not connected' }, { status: 404 })
  }

  const account = accounts[0]

  // max_results: 1〜100の範囲でクランプ
  const maxResultsRaw = url.searchParams.get('max_results') ?? '50'
  const maxResults = Math.min(100, Math.max(1, parseInt(maxResultsRaw, 10) || 50))

  const timelineUrl = `${X_API_BASE}/users/${account.x_user_id}/tweets?max_results=${maxResults}&tweet.fields=id,text,created_at`

  try {
    const response = await fetch(timelineUrl, {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const message = data.errors?.[0]?.message ?? `X API error: ${response.status}`
      return NextResponse.json({ error: message }, { status: 422 })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch timeline'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
