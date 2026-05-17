import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface UserStats {
  followers_count: number
  following_count: number
  tweet_count: number
  listed_count: number
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const url = new URL(request.url)
  const xAccountId = url.searchParams.get('x_account_id')

  let accountQuery = supabase
    .from('x_accounts')
    .select('id, x_user_id')
    .eq('user_id', user.id)
  if (xAccountId) accountQuery = (accountQuery as any).eq('id', xAccountId)

  const { data: accounts } = await (accountQuery as any)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'X account not connected' }, { status: 404 })
  }

  const account = accounts[0]

  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN が設定されていません' }, { status: 500 })
  }

  const userUrl = `https://api.x.com/2/users/${account.x_user_id}?user.fields=public_metrics`

  try {
    const response = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    })

    const data = await response.json()

    if (!response.ok) {
      const message = data.errors?.[0]?.message ?? `X API error: ${response.status}`
      console.error('[x/user-stats] X API error:', message)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { followers_count, following_count, tweet_count, listed_count } =
      data.data?.public_metrics ?? {}

    return NextResponse.json({
      followers_count: followers_count ?? 0,
      following_count: following_count ?? 0,
      tweet_count: tweet_count ?? 0,
      listed_count: listed_count ?? 0,
    } satisfies UserStats)
  } catch (err) {
    console.error('[x/user-stats] fetch error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
