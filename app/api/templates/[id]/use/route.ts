import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { id } = await params

  const { data: current, error: fetchError } = await supabase
    .from('post_templates')
    .select('use_count')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
  }

  const { error } = await supabase
    .from('post_templates')
    .update({ use_count: current.use_count + 1, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
