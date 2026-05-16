import { NextResponse } from 'next/server'
import { getRequestToken, buildAuthorizationUrl } from '@/lib/x/oauth'

export async function GET(_request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'
  const callbackUrl = process.env.X_CALLBACK_URL ?? `${baseUrl}/api/auth/x/callback`

  let requestToken: { oauth_token: string; oauth_token_secret: string }
  try {
    requestToken = await getRequestToken(callbackUrl)
  } catch (error) {
    console.error('[GET /api/auth/x/initiate] getRequestToken failed:', error)
    return NextResponse.json({ error: 'X認証の開始に失敗しました' }, { status: 500 })
  }

  const authorizationUrl = buildAuthorizationUrl(requestToken.oauth_token)

  const response = NextResponse.redirect(authorizationUrl)
  response.cookies.set('x_oauth_request_secret', requestToken.oauth_token_secret, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
