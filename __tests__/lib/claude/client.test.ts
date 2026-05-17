import { describe, it, expect, vi, beforeEach } from 'vitest'

// Vercel AI SDK の generateText をモック
// vi.mock はホイスティングされるため、mockGenerateText はモジュール外変数を参照できない。
// vi.hoisted() を使ってホイスティング前に変数を作成する。
const mockGenerateText = vi.hoisted(() => vi.fn())

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}))

// models モジュールをモック（実際の Anthropic モデル初期化を回避）
vi.mock('@/lib/ai/models', () => ({
  STYLE_PROFILE_MODEL: 'mock-style-model',
  DRAFT_MODEL: 'mock-draft-model',
}))

import { generateStyleProfile, generateDraftCandidates } from '@/lib/ai/client'

describe('generateStyleProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('テキストコンテンツなし（text が空文字列）の場合は "Claude APIから予期しないレスポンスが返りました" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: '' })

    await expect(generateStyleProfile(['tweet1', 'tweet2'])).rejects.toThrow(
      'Claude APIから予期しないレスポンスが返りました'
    )
  })

  it('JSON が抽出できない場合は "Claude APIのレスポンスからJSONを抽出できませんでした" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: 'This is not JSON at all' })

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスからJSONを抽出できませんでした'
    )
  })

  it('不正JSON の場合は "Claude APIのレスポンスをパースできませんでした" をthrowする', async () => {
    // { で始まるが無効なJSON
    mockGenerateText.mockResolvedValue({ text: '{invalid json content}' })

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスをパースできませんでした'
    )
  })

  it('正常系: StyleProfile オブジェクトを返す', async () => {
    const profileJson = '{"tone": "casual", "emoji_usage": "rare", "avg_length": 80}'
    mockGenerateText.mockResolvedValue({ text: profileJson })

    const result = await generateStyleProfile(['tweet1', 'tweet2'])

    expect(result).toEqual({
      tone: 'casual',
      emoji_usage: 'rare',
      avg_length: 80,
    })
  })

  it('マークダウンコードブロックで包まれたJSONも正常にパースできる', async () => {
    const profileJson = '```json\n{"tone": "formal", "emoji_usage": "none"}\n```'
    mockGenerateText.mockResolvedValue({ text: profileJson })

    const result = await generateStyleProfile(['tweet1'])

    expect(result).toEqual({ tone: 'formal', emoji_usage: 'none' })
  })

  it('100件超のツイートを渡しても最初の100件のみ generateText に渡される', async () => {
    const profileJson = '{"tone": "casual"}'
    mockGenerateText.mockResolvedValue({ text: profileJson })

    const tweets = Array.from({ length: 150 }, (_, i) => `tweet ${i + 1}`)
    await generateStyleProfile(tweets)

    expect(mockGenerateText).toHaveBeenCalledTimes(1)
    const callArg = mockGenerateText.mock.calls[0][0]
    const prompt = callArg.prompt as string

    // 100件目は含まれるが101件目以降は含まれない
    expect(prompt).toContain('[100]')
    expect(prompt).not.toContain('[101]')
  })
})

describe('generateDraftCandidates', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('テキストコンテンツなし（text が空文字列）の場合は "Unexpected response from Claude API" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: '' })

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Unexpected response from Claude API')
  })

  it('JSON配列が抽出できない場合は "Failed to extract JSON array from Claude response" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: 'No array here' })

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Failed to extract JSON array from Claude response')
  })

  it('正常系: 3要素の候補配列を返す', async () => {
    const candidates = ['candidate1', 'candidate2', 'candidate3']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidates) })

    const result = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(result).toEqual(['candidate1', 'candidate2', 'candidate3'])
  })

  it('4件以上の候補が返ってきても最初の3件のみ返す', async () => {
    const candidates = ['c1', 'c2', 'c3', 'c4', 'c5']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidates) })

    const result = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(result).toHaveLength(3)
    expect(result).toEqual(['c1', 'c2', 'c3'])
  })

  it('instruction が省略（undefined）でもエラーなく実行できる', async () => {
    const candidates = ['c1', 'c2', 'c3']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidates) })

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).resolves.toEqual(['c1', 'c2', 'c3'])
  })
})
