import { createClient } from '@/lib/supabase/server'
import { fetchTweetMetrics } from '@/lib/x/analytics'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const url = new URL(request.url)
  const xAccountId = url.searchParams.get('x_account_id')

  let accountQuery = supabase
    .from('x_accounts')
    .select('id, x_user_id, access_token, access_token_secret')
    .eq('user_id', user.id)
  if (xAccountId) accountQuery = accountQuery.eq('id', xAccountId)

  const { data: accounts } = await accountQuery

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'X account not connected' }, { status: 404 })
  }

  const account = accounts[0]

  const maxResultsRaw = url.searchParams.get('max_results') ?? '20'
  const maxResults = Math.min(100, Math.max(1, parseInt(maxResultsRaw, 10) || 20))

  try {
    const metrics = await fetchTweetMetrics({
      x_user_id: account.x_user_id,
      access_token: account.access_token,
      access_token_secret: account.access_token_secret,
      max_results: maxResults,
    })

    return NextResponse.json(metrics)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
