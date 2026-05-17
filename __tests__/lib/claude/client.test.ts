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

const mockUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 }

describe('generateStyleProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('テキストコンテンツなし（text が空文字列）の場合は "Claude APIから予期しないレスポンスが返りました" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: '', usage: mockUsage })

    await expect(generateStyleProfile(['tweet1', 'tweet2'])).rejects.toThrow(
      'Claude APIから予期しないレスポンスが返りました'
    )
  })

  it('JSON が抽出できない場合は "Claude APIのレスポンスからJSONを抽出できませんでした" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: 'This is not JSON at all', usage: mockUsage })

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスからJSONを抽出できませんでした'
    )
  })

  it('不正JSON の場合は "Claude APIのレスポンスをパースできませんでした" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: '{invalid json content}', usage: mockUsage })

    await expect(generateStyleProfile(['tweet1'])).rejects.toThrow(
      'Claude APIのレスポンスをパースできませんでした'
    )
  })

  it('正常系: profile と usage を返す', async () => {
    const profileJson = '{"tone": "casual", "emoji_usage": "rare", "avg_length": 80}'
    mockGenerateText.mockResolvedValue({ text: profileJson, usage: mockUsage })

    const { profile, usage } = await generateStyleProfile(['tweet1', 'tweet2'])

    expect(profile).toEqual({ tone: 'casual', emoji_usage: 'rare', avg_length: 80 })
    expect(usage).toEqual({ input_tokens: 100, output_tokens: 50 })
  })

  it('マークダウンコードブロックで包まれたJSONも正常にパースできる', async () => {
    const profileJson = '```json\n{"tone": "formal", "emoji_usage": "none"}\n```'
    mockGenerateText.mockResolvedValue({ text: profileJson, usage: mockUsage })

    const { profile } = await generateStyleProfile(['tweet1'])

    expect(profile).toEqual({ tone: 'formal', emoji_usage: 'none' })
  })

  it('100件超のツイートを渡しても最初の100件のみ generateText に渡される', async () => {
    const profileJson = '{"tone": "casual"}'
    mockGenerateText.mockResolvedValue({ text: profileJson, usage: mockUsage })

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
    mockGenerateText.mockResolvedValue({ text: '', usage: mockUsage })

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Unexpected response from Claude API')
  })

  it('JSON配列が抽出できない場合は "Failed to extract JSON array from Claude response" をthrowする', async () => {
    mockGenerateText.mockResolvedValue({ text: 'No array here', usage: mockUsage })

    await expect(
      generateDraftCandidates('source tweet', { tone: 'casual' })
    ).rejects.toThrow('Failed to extract JSON array from Claude response')
  })

  it('正常系: candidates と usage を返す', async () => {
    const candidatesArr = ['candidate1', 'candidate2', 'candidate3']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidatesArr), usage: mockUsage })

    const { candidates, usage } = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(candidates).toEqual(['candidate1', 'candidate2', 'candidate3'])
    expect(usage).toEqual({ input_tokens: 100, output_tokens: 50 })
  })

  it('4件以上の候補が返ってきても最初の3件のみ返す', async () => {
    const candidatesArr = ['c1', 'c2', 'c3', 'c4', 'c5']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidatesArr), usage: mockUsage })

    const { candidates } = await generateDraftCandidates('source tweet', { tone: 'casual' })

    expect(candidates).toHaveLength(3)
    expect(candidates).toEqual(['c1', 'c2', 'c3'])
  })

  it('instruction が省略（undefined）でもエラーなく実行できる', async () => {
    const candidatesArr = ['c1', 'c2', 'c3']
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(candidatesArr), usage: mockUsage })

    const { candidates } = await generateDraftCandidates('source tweet', { tone: 'casual' })
    expect(candidates).toEqual(['c1', 'c2', 'c3'])
  })
})
