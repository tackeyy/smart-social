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

  // scheduled_posts の DELETE ではなく、drafts のスケジュールをキャンセル（status を 'pending' に戻す）
  const { data, error } = await supabase
    .from('drafts')
    .update({ scheduled_at: null, status: 'pending' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'scheduled')  // scheduled 状態のものだけキャンセル可
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'スケジュール済みの投稿が見つかりません' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
