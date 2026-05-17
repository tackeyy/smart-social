import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPlanLimits, canUseFeature, getMonthlyAiLimit, getUserPlan } from '@/lib/subscription'

/**
 * lib/subscription.ts のユニットテスト
 *
 * 対象関数:
 * - getPlanLimits(plan) → プランごとの制限値を返す
 * - canUseFeature(plan, feature) → 機能が使えるか boolean
 * - getMonthlyAiLimit(plan) → 月間AI生成上限数を返す
 */
describe('getPlanLimits', () => {
  it('free プランの制限値が正しいこと（AI生成10件、Xアカウント1、スケジュール5件/月）', () => {
    // Arrange & Act
    const limits = getPlanLimits('free')

    // Assert
    expect(limits.aiGenerationsPerMonth).toBe(10)
    expect(limits.xAccounts).toBe(1)
    expect(limits.scheduledPostsPerMonth).toBe(5)
  })

  it('pro プランの制限値が正しいこと（AI生成100件、Xアカウント3、スケジュール無制限）', () => {
    // Arrange & Act
    const limits = getPlanLimits('pro')

    // Assert
    expect(limits.aiGenerationsPerMonth).toBe(100)
    expect(limits.xAccounts).toBe(3)
    expect(limits.scheduledPostsPerMonth).toBe(Infinity)
  })

  it('business プランの制限値が正しいこと（AI生成無制限=Infinity、Xアカウント10）', () => {
    // Arrange & Act
    const limits = getPlanLimits('business')

    // Assert
    expect(limits.aiGenerationsPerMonth).toBe(Infinity)
    expect(limits.xAccounts).toBe(10)
  })

  it('異常系: 不正なプラン名を渡した場合はエラーをスローする', () => {
    // Arrange & Act & Assert
    expect(() => getPlanLimits('invalid' as 'free' | 'pro' | 'business')).toThrow()
  })
})

describe('canUseFeature', () => {
  it('free プランでは文体プロファイルが使えないこと', () => {
    // Arrange & Act
    const result = canUseFeature('free', 'style-profile')

    // Assert
    expect(result).toBe(false)
  })

  it('pro プランでは文体プロファイルが使えること', () => {
    // Arrange & Act
    const result = canUseFeature('pro', 'style-profile')

    // Assert
    expect(result).toBe(true)
  })

  it('business プランでは文体プロファイルが使えること', () => {
    // Arrange & Act
    const result = canUseFeature('business', 'style-profile')

    // Assert
    expect(result).toBe(true)
  })

  it('free プランでは auto-plug が使えないこと', () => {
    // Arrange & Act
    const result = canUseFeature('free', 'auto-plug')

    // Assert
    expect(result).toBe(false)
  })

  it('pro プランでは auto-plug が使えること', () => {
    // Arrange & Act
    const result = canUseFeature('pro', 'auto-plug')

    // Assert
    expect(result).toBe(true)
  })

  it('business プランでは auto-plug が使えること', () => {
    // Arrange & Act
    const result = canUseFeature('business', 'auto-plug')

    // Assert
    expect(result).toBe(true)
  })

  it('異常系: 存在しない機能名を渡した場合は false を返す（未知の機能はデフォルト拒否）', () => {
    // Arrange & Act
    const result = canUseFeature('pro', 'nonexistent-feature')

    // Assert
    expect(result).toBe(false)
  })
})

describe('getMonthlyAiLimit', () => {
  it('free プランの月間AI生成上限は10件であること', () => {
    // Arrange & Act
    const limit = getMonthlyAiLimit('free')

    // Assert
    expect(limit).toBe(10)
  })

  it('pro プランの月間AI生成上限は100件であること', () => {
    // Arrange & Act
    const limit = getMonthlyAiLimit('pro')

    // Assert
    expect(limit).toBe(100)
  })

  it('business プランの月間AI生成上限は無制限（Infinity）であること', () => {
    // Arrange & Act
    const limit = getMonthlyAiLimit('business')

    // Assert
    expect(limit).toBe(Infinity)
  })

  it('異常系: 不正なプラン名を渡した場合はエラーをスローする', () => {
    // Arrange & Act & Assert
    expect(() => getMonthlyAiLimit('unknown' as 'free' | 'pro' | 'business')).toThrow()
  })
})

/**
 * getUserPlan のテスト
 *
 * 仕様:
 * - subscriptions テーブルから userId に紐づくアクティブなレコードを取得し Plan を返す
 * - status が 'active' または 'trialing' のみ有効とみなす
 * - レコードなし or 無効 status の場合は 'free' にフォールバック
 */
describe('getUserPlan', () => {
  // supabase モックのファクトリ
  const makeSupabase = (result: { data: unknown; error: unknown }) => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    }),
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('active な pro サブスクリプションがある場合は "pro" を返す', async () => {
    // Arrange
    const supabase = makeSupabase({
      data: { plan: 'pro', status: 'active' },
      error: null,
    })

    // Act
    const plan = await getUserPlan(supabase as never, 'user-1')

    // Assert
    expect(plan).toBe('pro')
  })

  it('trialing な business サブスクリプションがある場合は "business" を返す', async () => {
    // Arrange
    const supabase = makeSupabase({
      data: { plan: 'business', status: 'trialing' },
      error: null,
    })

    // Act
    const plan = await getUserPlan(supabase as never, 'user-2')

    // Assert
    expect(plan).toBe('business')
  })

  it('subscriptions レコードがない場合（.single() が error）は "free" を返す', async () => {
    // Arrange
    const supabase = makeSupabase({
      data: null,
      error: { code: 'PGRST116', message: 'Row not found' },
    })

    // Act
    const plan = await getUserPlan(supabase as never, 'user-3')

    // Assert
    expect(plan).toBe('free')
  })

  it('status が "past_due" の場合は "free" を返す（ダウングレード扱い）', async () => {
    // Arrange
    const supabase = makeSupabase({
      data: { plan: 'pro', status: 'past_due' },
      error: null,
    })

    // Act
    const plan = await getUserPlan(supabase as never, 'user-4')

    // Assert
    expect(plan).toBe('free')
  })

  it('status が "canceled" の場合は "free" を返す', async () => {
    // Arrange
    const supabase = makeSupabase({
      data: { plan: 'pro', status: 'canceled' },
      error: null,
    })

    // Act
    const plan = await getUserPlan(supabase as never, 'user-5')

    // Assert
    expect(plan).toBe('free')
  })
})
