import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postTweet, deleteTweet } from '@/lib/x/client'

describe('postTweet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('X APIが200を返すとtweetのidとtextが返る', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: '1234567890', text: 'Hello World' },
      }),
    })

    // Act
    const result = await postTweet({ text: 'Hello World' })

    // Assert
    expect(result).toEqual({ id: '1234567890', text: 'Hello World' })
  })

  it('X APIが429を返すとRateLimitErrorがthrowされる', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errors: [{ message: 'Rate limit exceeded' }] }),
    })

    // Act & Assert
    await expect(postTweet({ text: 'Hello World' })).rejects.toThrow('RateLimitError')
  })

  it('X APIが401を返すとAuthErrorがthrowされる', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    })

    // Act & Assert
    await expect(postTweet({ text: 'Hello World' })).rejects.toThrow('AuthError')
  })
})

describe('deleteTweet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('X APIが200を返すと { deleted: true } が返る', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { deleted: true } }),
    })

    const result = await deleteTweet('tweet-123')
    expect(result).toEqual({ deleted: true })
  })

  it('X APIが429を返すとRateLimitErrorがthrowされる', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errors: [{ message: 'Rate limit exceeded' }] }),
    })

    await expect(deleteTweet('tweet-123')).rejects.toThrow('RateLimitError')
  })

  it('X APIが401を返すとAuthErrorがthrowされる', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    })

    await expect(deleteTweet('tweet-123')).rejects.toThrow('AuthError')
  })
})
