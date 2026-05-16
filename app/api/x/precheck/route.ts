import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runPrecheck } from '@/lib/precheck/engine'
import type { TemplateChannel } from '@/lib/precheck/engine'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await request.json()
  const { text, channel } = body as { text?: string; channel?: string }

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'textは必須です' }, { status: 400 })
  }

  const validChannels: TemplateChannel[] = ['post', 'reply', 'dm']
  const safeChannel: TemplateChannel = validChannels.includes(channel as TemplateChannel)
    ? (channel as TemplateChannel)
    : 'post'

  const result = await runPrecheck(text, safeChannel)
  return NextResponse.json(result)
}
