import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logUsage } from '@/lib/usage/logger'

const makeSupabase = (overrides?: Record<string, unknown>) => ({
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  }),
})

describe('logUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正しいパラメータで supabase.insert を呼ぶ', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) }

    await logUsage(supabase as never, 'user-123', {
      endpoint: 'drafts_generate',
      model: 'claude-sonnet-4-6',
      input_tokens: 500,
      output_tokens: 200,
    })

    expect(supabase.from).toHaveBeenCalledWith('ai_usage_logs')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      endpoint: 'drafts_generate',
      model: 'claude-sonnet-4-6',
      input_tokens: 500,
      output_tokens: 200,
      cost_usd: expect.any(Number),
    })
  })

  it('cost_usd が calcCostUsd の計算結果になっている', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) }

    await logUsage(supabase as never, 'user-123', {
      endpoint: 'drafts_generate',
      model: 'claude-sonnet-4-6',
      input_tokens: 500,
      output_tokens: 200,
    })

    const insertedData = mockInsert.mock.calls[0][0]
    // $3/MTok * 500 / 1M + $15/MTok * 200 / 1M = $0.0015 + $0.003 = $0.0045
    expect(insertedData.cost_usd).toBeCloseTo(0.0045, 6)
  })

  it('insert 失敗時にエラーを throw しない', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: new Error('DB error') })
    const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      logUsage(supabase as never, 'user-123', {
        endpoint: 'precheck',
        model: 'claude-haiku-4-5-20251001',
        input_tokens: 100,
        output_tokens: 50,
      })
    ).resolves.toBeUndefined()

    consoleSpy.mockRestore()
  })

  it('insert 失敗時に console.error を呼ぶ', async () => {
    const dbError = new Error('DB error')
    const mockInsert = vi.fn().mockResolvedValue({ error: dbError })
    const supabase = { from: vi.fn().mockReturnValue({ insert: mockInsert }) }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await logUsage(supabase as never, 'user-456', {
      endpoint: 'profile_generate',
      model: 'claude-sonnet-4-6',
      input_tokens: 1000,
      output_tokens: 300,
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('logUsage'),
      dbError
    )

    consoleSpy.mockRestore()
  })
})
