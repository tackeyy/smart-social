import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getAccessToken } from '@/lib/x/oauth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const oauthToken = searchParams.get('oauth_token')
  const oauthVerifier = searchParams.get('oauth_verifier')

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json({ error: '認証トークンが不足しています' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const requestTokenSecret = cookieStore.get('x_oauth_request_secret')?.value

  if (!requestTokenSecret) {
    return NextResponse.json({ error: 'リクエストトークンが見つかりません' }, { status: 400 })
  }

  let accessTokenData: { access_token: string; access_token_secret: string; user_id: string; screen_name: string }
  try {
    accessTokenData = await getAccessToken(oauthToken, oauthVerifier, requestTokenSecret)
  } catch (error) {
    console.error('[GET /api/auth/x/callback] getAccessToken failed:', error)
    return NextResponse.json({ error: 'アクセストークンの取得に失敗しました' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { error: upsertError } = await supabase
    .from('x_accounts')
    .upsert(
      {
        user_id: user.id,
        x_user_id: accessTokenData.user_id,
        screen_name: accessTokenData.screen_name,
        access_token: accessTokenData.access_token,
        access_token_secret: accessTokenData.access_token_secret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,x_user_id' }
    )

  if (upsertError) {
    console.error('[GET /api/auth/x/callback] upsert failed:', upsertError)
    return NextResponse.json({ error: 'アカウントの保存に失敗しました' }, { status: 500 })
  }

  const response = NextResponse.redirect(
    new URL('/dashboard', process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000')
  )
  response.cookies.delete('x_oauth_request_secret')

  return response
}
