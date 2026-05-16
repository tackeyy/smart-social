import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const X_API_BASE = 'https://api.x.com/2'
const TWEET_URL_PATTERN = /^https?:\/\/(?:x|twitter)\.com\/\S+\/status\/(\d+)/

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tweetUrl = searchParams.get('url')

  if (!tweetUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
  }

  const match = tweetUrl.match(TWEET_URL_PATTERN)
  if (!match) {
    return NextResponse.json({ error: 'Invalid tweet URL' }, { status: 400 })
  }

  const tweetId = match[1]

  try {
    const res = await fetch(
      `${X_API_BASE}/tweets/${tweetId}?tweet.fields=text,author_id`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    )

    const json = await res.json()

    if (!res.ok) {
      const message = json.errors?.[0]?.message ?? `X API error: ${res.status}`
      const status = res.status === 404 ? 404 : 502
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      tweet_id: json.data.id,
      text: json.data.text,
      author_id: json.data.author_id ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tweet'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
