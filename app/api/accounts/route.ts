import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('x_accounts')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('[GET /api/accounts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { screen_name, x_user_id } = body as Record<string, unknown>

  if (!screen_name || !x_user_id) {
    return NextResponse.json({ error: 'screen_name, x_user_id are required' }, { status: 400 })
  }

  if (typeof screen_name !== 'string') {
    return NextResponse.json({ error: 'screen_name must be a string' }, { status: 400 })
  }

  if (!screen_name.trim()) {
    return NextResponse.json({ error: 'screen_name must not be empty' }, { status: 400 })
  }

  if (!/^[A-Za-z0-9_]{1,50}$/.test(screen_name as string)) {
    return NextResponse.json(
      { error: 'screen_name must be alphanumeric and underscores only (max 50 chars)' },
      { status: 400 }
    )
  }

  if (!/^\d+$/.test(x_user_id as string)) {
    return NextResponse.json({ error: 'x_user_id must be a numeric string' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('x_accounts')
    .insert({ user_id: user.id, screen_name, x_user_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This X account is already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
