import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// テスト互換のAnthropicインスタンス生成（vi.fn() mock が new に対応していない環境で動作）
function createAnthropic() {
  // Anthropic SDK は exports = function(...args) { return new exports.default(...args) }
  // つまり関数としても呼び出せる設計になっている
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Anthropic as unknown as (...args: unknown[]) => InstanceType<typeof Anthropic>)()
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    x_account_id?: string
    source_tweet_url?: string
    source_tweet_text?: string
    instruction?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.x_account_id || !body.source_tweet_url) {
    return NextResponse.json({ error: 'x_account_id and source_tweet_url are required' }, { status: 400 })
  }

  // x_account_id の所有権確認
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id, user_id')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'X account not found or access denied' }, { status: 403 })
  }

  // style_profiles から最新プロファイル取得
  const { data: styleProfile, error: profileError } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('x_account_id', body.x_account_id)
    .single()

  if (profileError || !styleProfile) {
    return NextResponse.json(
      { error: 'プロファイルが見つかりません。先にプロファイルを生成してください。' },
      { status: 404 }
    )
  }

  // Claude API で3候補生成
  try {
    const anthropic = createAnthropic()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下のツイートに対するリプライ案を3つ生成してください。
文体プロファイルに従い、JSON配列形式で出力してください。

元ツイート:
${body.source_tweet_text ?? body.source_tweet_url}

文体プロファイル:
${JSON.stringify(styleProfile, null, 2)}

${body.instruction ? `追加指示: ${body.instruction}` : ''}

出力形式: ["候補1", "候補2", "候補3"]`,
        },
      ],
    })

    const textContent = message.content.find((c: { type: string }) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Unexpected response from Claude API')
    }

    let candidates: string[]
    try {
      const jsonMatch = (textContent as { type: 'text'; text: string }).text.match(/\[[\s\S]*\]/)
      candidates = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse((textContent as { type: 'text'; text: string }).text)
    } catch {
      throw new Error('Failed to parse Claude response as JSON array')
    }

    // reply_drafts に INSERT
    const now = new Date().toISOString()
    const { data: insertedDrafts, error: insertError } = await supabase
      .from('reply_drafts')
      .insert(
        candidates.map((text: string) => ({
          x_account_id: body.x_account_id,
          source_tweet_url: body.source_tweet_url,
          source_tweet_text: body.source_tweet_text,
          content: text,
          status: 'pending',
          draft_candidates: [
            {
              text,
              generated_by: 'claude-sonnet-4-6',
              created_at: now,
            },
          ],
        }))
      )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ drafts: insertedDrafts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate drafts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
