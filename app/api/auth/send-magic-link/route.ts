import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })
  }

  const allowedEmail = process.env.ALLOWED_EMAIL
  if (allowedEmail && email !== allowedEmail) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 403 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/smart-social/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Magic link sent' })
}
