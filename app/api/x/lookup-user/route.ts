import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace(/^@/, '')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const bearerToken = process.env.X_BEARER_TOKEN
  if (!bearerToken) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  )

  if (!res.ok) {
    if (res.status === 404) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({ error: `X API error: ${res.status}` }, { status: 500 })
  }

  const { data } = await res.json()
  return NextResponse.json({
    x_user_id: data.id,
    display_name: data.name,
    x_username: data.username,
  })
}
