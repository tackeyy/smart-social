import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const X_API_BASE = 'https://api.x.com/2'

// テスト互換のAnthropicインスタンス生成（vi.fn() mock が new に対応していない環境で動作）
function createAnthropic() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Anthropic as unknown as (...args: unknown[]) => InstanceType<typeof Anthropic>)()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { x_account_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.x_account_id) {
    return NextResponse.json({ error: 'x_account_id is required' }, { status: 400 })
  }

  // x_account_id の所有権確認
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id, user_id, x_user_id, access_token')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'X account not found or access denied' }, { status: 403 })
  }

  // X API でツイート取得（最大100件）
  const timelineUrl = `${X_API_BASE}/users/${account.x_user_id}/tweets?max_results=100&tweet.fields=id,text,created_at`
  const xResponse = await fetch(timelineUrl, {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
    },
  })

  const xData = await xResponse.json()
  const tweets: Array<{ id: string; text: string }> = xData.data ?? []

  // Anthropic SDK でプロファイル生成
  try {
    const anthropic = createAnthropic()
    const tweetTexts = tweets.map(t => t.text).join('\n---\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下のツイートから文体プロファイルをJSONで生成してください。
出力形式: { tone, emoji_usage, avg_length, patterns: string[], sample_phrases: string[] }

ツイート:
${tweetTexts}`,
        },
      ],
    })

    const textContent = message.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Unexpected response from Claude API')
    }

    let profileData: object
    try {
      const jsonMatch = (textContent as { type: 'text'; text: string }).text.match(/\{[\s\S]*\}/)
      profileData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse((textContent as { type: 'text'; text: string }).text)
    } catch {
      profileData = { raw: (textContent as { type: 'text'; text: string }).text }
    }

    // style_profiles に保存
    const { data: savedProfile } = await supabase
      .from('style_profiles')
      .upsert({
        x_account_id: body.x_account_id,
        profile_data: profileData,
        model_version: 'claude-sonnet-4-6',
        analyzed_at: new Date().toISOString(),
      })

    return NextResponse.json({ profile: savedProfile ?? profileData })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
