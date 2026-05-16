import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateTemplateInput } from '@/lib/templates'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, channel, body: templateBody, tags } = body

  if (name !== undefined || channel !== undefined || templateBody !== undefined) {
    const errors = validateTemplateInput({
      accountId: 'placeholder',
      name: name ?? 'placeholder',
      channel: channel ?? 'post',
      body: templateBody ?? 'placeholder',
      tags,
    })
    const relevantErrors = errors.filter((e) => !e.includes('テンプレート名は必須') || name !== undefined)
    if (relevantErrors.length > 0) {
      return NextResponse.json({ error: relevantErrors[0] }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (channel !== undefined) updates.channel = channel
  if (templateBody !== undefined) updates.body = templateBody
  if (tags !== undefined) updates.tags = tags

  const { data, error } = await supabase
    .from('post_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })

  return NextResponse.json({ template: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase.from('post_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })

  return new Response(null, { status: 204 })
}
