import { describe, it, expect } from 'vitest'
import { getPlanLimits, canUseFeature, getMonthlyAiLimit } from '@/lib/subscription'

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
    expect(() => getMonthlyAiLimit('unknown')).toThrow()
  })
})
