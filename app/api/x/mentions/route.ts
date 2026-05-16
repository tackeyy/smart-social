import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

const X_API_BASE = 'https://api.x.com/2'

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A')
}

function buildOAuthHeader(
  method: string,
  url: string,
  accessToken: string,
  accessTokenSecret: string,
): string {
  const apiKey = process.env.X_API_KEY!
  const apiSecret = process.env.X_API_SECRET!

  const nonce = randomBytes(16).toString('hex')
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const sorted = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  const base = [method.toUpperCase(), percentEncode(url), percentEncode(sorted)].join('&')
  const key = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`
  oauthParams.oauth_signature = createHmac('sha1', key).update(base).digest('base64')

  const header = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  return `OAuth ${header}`
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
    .select('id, x_user_id, access_token, access_token_secret')
    .eq('user_id', user.id)
  if (xAccountId) accountQuery = (accountQuery as any).eq('id', xAccountId)

  const { data: accounts } = await (accountQuery as any)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'X account not connected' }, { status: 404 })
  }

  const account = accounts[0]

  const maxResultsRaw = url.searchParams.get('max_results') ?? '20'
  const maxResults = Math.min(100, Math.max(1, parseInt(maxResultsRaw, 10) || 20))

  const mentionsUrl = `${X_API_BASE}/users/${account.x_user_id}/mentions`
  const params = new URLSearchParams({
    max_results: String(maxResults),
    'tweet.fields': 'created_at,text,author_id',
    expansions: 'author_id',
    'user.fields': 'name,username',
  })

  const authHeader = buildOAuthHeader('GET', mentionsUrl, account.access_token, account.access_token_secret)

  try {
    const response = await fetch(`${mentionsUrl}?${params}`, {
      headers: { Authorization: authHeader },
    })

    const data = await response.json()

    if (!response.ok) {
      const message = data.errors?.[0]?.message ?? `X API error: ${response.status}`
      console.error('[x/mentions] X API error:', { status: response.status, message })
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[x/mentions] fetch error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
