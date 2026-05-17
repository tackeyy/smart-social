import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runPrecheck } from '@/lib/precheck/engine'
import type { TemplateChannel } from '@/lib/precheck/engine'
import { checkMonthlyQuota } from '@/lib/usage/quota'
import { logUsage } from '@/lib/usage/logger'

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

  const quota = await checkMonthlyQuota(supabase, user.id)
  if (!quota.allowed) {
    return NextResponse.json(
      { error: '月次トークン上限に達しました。翌月まで操作できません。' },
      { status: 429 }
    )
  }

  const { result, usage } = await runPrecheck(text, safeChannel)

  if (usage) {
    await logUsage(supabase, user.id, {
      endpoint: 'precheck',
      model: 'claude-haiku-4-5-20251001',
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    })
  }

  return NextResponse.json(result)
}
