import Anthropic from '@anthropic-ai/sdk'

export interface StyleProfile {
  tone: string
  emoji_usage?: string
  avg_length?: number
  patterns?: string[]
  sample_phrases?: string[]
  [key: string]: unknown
}

const client = new Anthropic()

export async function generateStyleProfile(tweets: string[]): Promise<StyleProfile> {
  const tweetList = tweets.join('\n---\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `以下のツイートから文体プロファイルをJSONで生成してください。
出力形式: { tone, emoji_usage, avg_length, patterns: string[], sample_phrases: string[] }

ツイート:
${tweetList}`,
      },
    ],
  })

  const textContent = message.content.find(c => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Unexpected response from Claude API')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response')
  }

  return JSON.parse(jsonMatch[0]) as StyleProfile
}

export async function generateDraftCandidates(
  sourceTweet: string,
  styleProfile: object,
  instruction?: string
): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `以下のツイートに対するリプライ案を3つ生成してください。
文体プロファイルに従い、JSON配列形式で出力してください。

元ツイート:
${sourceTweet}

文体プロファイル:
${JSON.stringify(styleProfile, null, 2)}

${instruction ? `追加指示: ${instruction}` : ''}

出力形式: ["候補1", "候補2", "候補3"]`,
      },
    ],
  })

  const textContent = message.content.find(c => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Unexpected response from Claude API')
  }

  const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON array from Claude response')
  }

  const candidates = JSON.parse(jsonMatch[0]) as string[]
  return candidates.slice(0, 3)
}
