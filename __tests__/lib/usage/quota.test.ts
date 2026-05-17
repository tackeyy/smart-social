import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkMonthlyQuota } from '@/lib/usage/quota'

const makeSupabase = (totalTokens: number) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({
      data: [{ input_tokens: totalTokens, output_tokens: 0 }],
      error: null,
    }),
  }),
})

describe('checkMonthlyQuota', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('MONTHLY_TOKEN_QUOTA が未設定（0）の場合は常に allowed: true', async () => {
    delete process.env.MONTHLY_TOKEN_QUOTA

    const { checkMonthlyQuota: fn } = await import('@/lib/usage/quota')

    const mockFrom = vi.fn()
    const supabase = { from: mockFrom }

    const result = await fn(supabase as never, 'user-123')

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('当月合計トークンが上限未満なら allowed: true', async () => {
    process.env.MONTHLY_TOKEN_QUOTA = '1000000'

    const { checkMonthlyQuota: fn } = await import('@/lib/usage/quota')

    const mockData = [
      { input_tokens: 300000, output_tokens: 100000 },
      { input_tokens: 200000, output_tokens: 50000 },
    ]
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    }

    const result = await fn(supabase as never, 'user-123')

    expect(result.allowed).toBe(true)
    expect(result.used).toBe(650000)
    expect(result.limit).toBe(1000000)
  })

  it('当月合計トークンが上限以上なら allowed: false', async () => {
    process.env.MONTHLY_TOKEN_QUOTA = '1000000'

    const { checkMonthlyQuota: fn } = await import('@/lib/usage/quota')

    const mockData = [
      { input_tokens: 700000, output_tokens: 400000 },
    ]
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    }

    const result = await fn(supabase as never, 'user-123')

    expect(result.allowed).toBe(false)
    expect(result.used).toBe(1100000)
  })

  it('当月合計トークンがちょうど上限と同値なら allowed: false', async () => {
    process.env.MONTHLY_TOKEN_QUOTA = '500000'

    const { checkMonthlyQuota: fn } = await import('@/lib/usage/quota')

    const mockData = [{ input_tokens: 500000, output_tokens: 0 }]
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }),
    }

    const result = await fn(supabase as never, 'user-123')

    expect(result.allowed).toBe(false)
  })

  it('DBエラーの場合は allowed: true（フェイルオープン）', async () => {
    process.env.MONTHLY_TOKEN_QUOTA = '1000000'

    const { checkMonthlyQuota: fn } = await import('@/lib/usage/quota')

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      }),
    }

    const result = await fn(supabase as never, 'user-123')

    expect(result.allowed).toBe(true)
  })
})
