import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkMonthlyQuota, checkAiGenerationQuota } from '@/lib/usage/quota'

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

/**
 * checkAiGenerationQuota のテスト
 *
 * 仕様:
 * - プランごとの月間AI生成上限（getMonthlyAiLimit）に対して、当月の実績件数を count で取得し判定する
 * - business プランは Infinity（DBクエリ不要で即許可）
 * - DBエラー時は used=0, allowed: true でフォールバック
 */
describe('checkAiGenerationQuota', () => {
  /**
   * supabase の from/select/eq/gte チェーンをモックし、count を返すファクトリ
   * @param count - 当月のAI生成件数
   * @param error  - エラーオブジェクト（null なら正常）
   */
  const makeSupabase = (count: number | null, error: unknown = null) => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count, error }),
    }),
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('free プラン・limit=10・used=5 → allowed: true', async () => {
    // Arrange
    const supabase = makeSupabase(5)

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-1', 'free')

    // Assert
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(5)
    expect(result.limit).toBe(10)
  })

  it('free プラン・limit=10・used=10 → allowed: false（境界値：上限到達）', async () => {
    // Arrange
    const supabase = makeSupabase(10)

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-2', 'free')

    // Assert
    expect(result.allowed).toBe(false)
    expect(result.used).toBe(10)
  })

  it('free プラン・limit=10・used=11 → allowed: false（上限超過）', async () => {
    // Arrange
    const supabase = makeSupabase(11)

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-3', 'free')

    // Assert
    expect(result.allowed).toBe(false)
  })

  it('pro プラン・limit=100・used=99 → allowed: true', async () => {
    // Arrange
    const supabase = makeSupabase(99)

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-4', 'pro')

    // Assert
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(99)
    expect(result.limit).toBe(100)
  })

  it('business プラン・limit=Infinity → allowed: true（DBクエリ不要）', async () => {
    // Arrange
    const mockFrom = vi.fn()
    const supabase = { from: mockFrom }

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-5', 'business')

    // Assert
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(Infinity)
    // Infinity プランはDBを叩かない
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('DBクエリエラー時 → used=0, allowed: false（フェイルクローズ）', async () => {
    // Arrange
    const supabase = makeSupabase(null, new Error('DB connection failed'))

    // Act
    const result = await checkAiGenerationQuota(supabase as never, 'user-6', 'free')

    // Assert
    expect(result.allowed).toBe(false)
    expect(result.used).toBe(0)
  })
})
