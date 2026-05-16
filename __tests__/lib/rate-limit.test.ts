import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, clearRateLimitCache } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => clearRateLimitCache())
  afterEach(() => vi.useRealTimers())

  it('初回呼び出しは allowed: true を返す', () => {
    const result = checkRateLimit('user-1:profile', 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remainingSec).toBe(0)
  })

  it('クールダウン内の2回目呼び出しは allowed: false を返す', () => {
    checkRateLimit('user-1:profile', 60_000)
    const result = checkRateLimit('user-1:profile', 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remainingSec).toBeGreaterThan(0)
  })

  it('クールダウン経過後は allowed: true を返す', () => {
    vi.useFakeTimers()
    checkRateLimit('user-1:profile', 60_000)
    vi.advanceTimersByTime(61_000)
    const result = checkRateLimit('user-1:profile', 60_000)
    expect(result.allowed).toBe(true)
  })

  it('異なるキーは独立して管理される', () => {
    checkRateLimit('user-1:profile', 60_000)
    const result = checkRateLimit('user-2:profile', 60_000)
    expect(result.allowed).toBe(true)
  })

  it('remainingSec はクールダウン残り秒数の切り上げ値', () => {
    vi.useFakeTimers()
    checkRateLimit('user-1:drafts', 60_000)
    vi.advanceTimersByTime(10_000)
    const result = checkRateLimit('user-1:drafts', 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remainingSec).toBe(50)
  })
})
