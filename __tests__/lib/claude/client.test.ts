import { describe, it, expect, vi, beforeEach } from 'vitest'

// Anthropic SDK のモック
// vi.mock はホイスティングされるため、mockCreate はモジュール外変数を参照できない。
// vi.hoisted() を使ってホイスティング前に変数を作成する。
const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => {
  // コンストラクタとして使えるように function で定義する
  function MockAnthropic() {
    return { messages: { create: mockCreate } }
  }
  return { default: MockAnthropic }
})

import { generateStyleProfile, generateDraftCandidates } from '@/lib/claude/client'

function makeTextResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  }
}

function makeEmptyContentResponse() {
  return {
    content: [],
  }
}

describe('generateStyleProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('テキストコンテンツなし（content が空）の場合は "Claude APIから予期しないレスポンスが返りました" をthrowする', async () => {
    mockCreate.mockResolvedValue(makeEmptyContentResponse())

    await expect(generateStyleProfile(['tweet1', 'tweet2'])).rejects.toThrow(
      'Claude APIから予期しないレスポンスが返りました'
    )
  })

  it('JSON が抽出できない場合は "Claude APIのレスポンスからJSONを抽出できませんでした" をthrowする', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('This is not JSON at all'))

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスからJSONを抽出できませんでした'
    )
  })

  it('不正JSON の場合は "Claude APIのレスポンスをパースできませんでした" をthrowする', async () => {
    // { で始まるが無効なJSON
    mockCreate.mockResolvedValue(makeTextResponse('{invalid json content}'))

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスをパースできませんでした'
    )
  })

  it('正常系: StyleProfile オブジェクトを返す', async () => {
    const profileJson = '{"tone": "casual", "emoji_usage": "rare", "avg_length": 80}'
    mockCreate.mockResolvedValue(makeTextResponse(profileJson))

    const result = await generateStyleProfile(['tweet1', 'tweet2'])

    expect(result).toEqual({
      tone: 'casual',
      emoji_usage: 'rare',
      avg_length: 80,
    })
  })

  it('マークダウンコードブロックで包まれたJSONも正常にパースできる', async () => {
    const profileJson = '```json\n{"tone": "formal", "emoji_usage": "none"}\n```'
    mockCreate.mockResolvedValue(makeTextResponse(profileJson))

    const result = await generateStyleProfile(['tweet1'])

    expect(result).toEqual({ tone: 'formal', emoji_usage: 'none' })
  })

  it('100件超のツイートを渡しても最初の100件のみ messages.create に渡される', async () => {
    const profileJson = '{"tone": "casual"}'
    mockCreate.mockResolvedValue(makeTextResponse(profileJson))

    const tweets = Array.from({ length: 150 }, (_, i) => `tweet ${i + 1}`)
    await generateStyleProfile(tweets)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const callArg = mockCreate.mock.calls[0][0]
    const userContent = callArg.messages[0].content as string

    // 100件目は含まれるが101件目以降は含まれない
    expect(userContent).toContain('[100]')
    expect(userContent).not.toContain('[101]')
  })
})

describe('generateDraftCandidates', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('テキストコンテンツなし（content が空）の場合は "Unexpected response from Claude API" をthrowする', async () => {
    mockCreate.mockResolvedValue(makeEmptyContentResponse())

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Unexpected response from Claude API')
  })

  it('JSON配列が抽出できない場合は "Failed to extract JSON array from Claude response" をthrowする', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('No array here'))

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Failed to extract JSON array from Claude response')
  })

  it('正常系: 3要素の候補配列を返す', async () => {
    const candidates = ['candidate1', 'candidate2', 'candidate3']
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(candidates)))

    const result = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(result).toEqual(['candidate1', 'candidate2', 'candidate3'])
  })

  it('4件以上の候補が返ってきても最初の3件のみ返す', async () => {
    const candidates = ['c1', 'c2', 'c3', 'c4', 'c5']
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(candidates)))

    const result = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(result).toHaveLength(3)
    expect(result).toEqual(['c1', 'c2', 'c3'])
  })

  it('instruction が省略（undefined）でもエラーなく実行できる', async () => {
    const candidates = ['c1', 'c2', 'c3']
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(candidates)))

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).resolves.toEqual(['c1', 'c2', 'c3'])
  })
})
