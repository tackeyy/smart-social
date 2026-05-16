import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('x_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  }

  if (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  }

  return NextResponse.json(data, { status: 200 })
}
