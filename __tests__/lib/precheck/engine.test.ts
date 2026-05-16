import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPrecheck, check280CharLimit } from '@/lib/precheck/engine'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate }
  }
  return { default: MockAnthropic }
})

describe('check280CharLimit', () => {
  it('280文字以内の場合はnullを返す', () => {
    const result = check280CharLimit('a'.repeat(280))
    expect(result).toBeNull()
  })

  it('281文字以上の場合はblockedルールを返す', () => {
    const result = check280CharLimit('a'.repeat(281))
    expect(result).not.toBeNull()
    expect(result?.severity).toBe('critical')
    expect(result?.category).toBe('char_limit')
  })
})

describe('runPrecheck', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('280文字超のテキストはClaude APIを呼ばずにblockedを返す', async () => {
    const result = await runPrecheck('a'.repeat(281), 'post')
    expect(result.decision).toBe('blocked')
    expect(result.score).toBe(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('Claude APIがauto_passを返した場合はauto_passになる', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          decision: 'auto_pass',
          score: 95,
          reasons: [],
          suggestions: [],
        }),
      }],
    })

    const result = await runPrecheck('今日は良い天気ですね！頑張りましょう。', 'post')
    expect(result.decision).toBe('auto_pass')
    expect(result.score).toBe(95)
    expect(result.reasons).toHaveLength(0)
  })

  it('Claude APIがblockedを返した場合はblockedになる', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          decision: 'blocked',
          score: 5,
          reasons: ['断定的税務助言が含まれています'],
          suggestions: ['「〜できます」を「〜の可能性があります」に変更してください'],
        }),
      }],
    })

    const result = await runPrecheck('この節税方法で絶対に税金が下がります！', 'post')
    expect(result.decision).toBe('blocked')
    expect(result.reasons).toContain('断定的税務助言が含まれています')
  })

  it('Claude APIがmanual_reviewを返した場合はmanual_reviewになる', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({
          decision: 'manual_review',
          score: 60,
          reasons: ['根拠が不明確な記述があります'],
          suggestions: ['出典を明記することを検討してください'],
        }),
      }],
    })

    const result = await runPrecheck('最近の調査によると節税効果が高いらしいです', 'post')
    expect(result.decision).toBe('manual_review')
    expect(result.score).toBe(60)
  })

  it('scoreは0〜100の範囲内', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: 'text',
        text: JSON.stringify({ decision: 'auto_pass', score: 85, reasons: [], suggestions: [] }),
      }],
    })

    const result = await runPrecheck('普通のツイートです', 'post')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('Claude APIが不正なJSONを返した場合はmanual_reviewにフォールバック', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '不正なJSON' }],
    })

    const result = await runPrecheck('何かテキスト', 'post')
    expect(result.decision).toBe('manual_review')
  })
})
