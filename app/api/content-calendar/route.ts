import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { filterEventsByMonth } from '@/lib/content-calendar'
import type { ContentCalendarEvent } from '@/types/content-calendar'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month')
  const month = monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1

  if (isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: '月は1〜12で指定してください' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_calendar_events')
    .select('*')
    .order('priority', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }

  const events = filterEventsByMonth((data ?? []) as ContentCalendarEvent[], month)
  return NextResponse.json({ events, month })
}
