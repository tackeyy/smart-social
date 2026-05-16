import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateTemplateInput } from '@/lib/templates'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const url = new URL(request.url)
  const accountId = url.searchParams.get('accountId')

  let query = supabase
    .from('post_templates')
    .select('*')
    .order('use_count', { ascending: false })

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await request.json()
  const { accountId, name, channel, body: templateBody, tags } = body

  const errors = validateTemplateInput({ accountId, name, channel, body: templateBody, tags })
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('post_templates')
    .insert({ account_id: accountId, name, channel, body: templateBody, tags: tags ?? [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 })

  return NextResponse.json({ template: data }, { status: 201 })
}
