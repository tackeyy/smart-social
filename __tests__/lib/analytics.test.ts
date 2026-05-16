import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchTweetMetrics } from '@/lib/x/analytics'

const BASE_PARAMS = {
  x_user_id: 'user123',
  access_token: 'token',
  access_token_secret: 'secret',
}

const makeXApiResponse = (tweets: object[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ data: tweets }),
})

describe('fetchTweetMetrics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // 環境変数のスタブ
    vi.stubEnv('X_API_KEY', 'test-api-key')
    vi.stubEnv('X_API_SECRET', 'test-api-secret')
  })

  it('APIレスポンスを正しくTweetMetrics[]にパースする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeXApiResponse([
          {
            id: '111',
            text: 'Hello World',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              like_count: 10,
              retweet_count: 5,
              reply_count: 2,
              impression_count: 1000,
            },
          },
        ]),
      ),
    )

    const result = await fetchTweetMetrics(BASE_PARAMS)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      tweet_id: '111',
      text: 'Hello World',
      created_at: '2024-01-01T00:00:00Z',
      like_count: 10,
      retweet_count: 5,
      reply_count: 2,
      impression_count: 1000,
    })
  })

  it('engagement_rate = (like+rt+reply) / impression * 100 で計算される', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeXApiResponse([
          {
            id: '222',
            text: 'Engagement test',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              like_count: 10,
              retweet_count: 5,
              reply_count: 5,
              impression_count: 1000,
            },
          },
        ]),
      ),
    )

    const result = await fetchTweetMetrics(BASE_PARAMS)

    // (10 + 5 + 5) / 1000 * 100 = 2.0
    expect(result[0].engagement_rate).toBeCloseTo(2.0)
  })

  it('impression_count = 0 の場合 engagement_rate は 0 になる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeXApiResponse([
          {
            id: '333',
            text: 'Zero impressions',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              like_count: 5,
              retweet_count: 3,
              reply_count: 1,
              impression_count: 0,
            },
          },
        ]),
      ),
    )

    const result = await fetchTweetMetrics(BASE_PARAMS)

    expect(result[0].engagement_rate).toBe(0)
  })

  it('data が空配列の場合は [] を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeXApiResponse([]),
      ),
    )

    const result = await fetchTweetMetrics(BASE_PARAMS)

    expect(result).toEqual([])
  })

  it('data フィールドが存在しない場合は [] を返す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      }),
    )

    const result = await fetchTweetMetrics(BASE_PARAMS)

    expect(result).toEqual([])
  })

  it('APIエラー時に Error をスローする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ errors: [{ message: 'Forbidden' }] }),
      }),
    )

    await expect(fetchTweetMetrics(BASE_PARAMS)).rejects.toThrow('Forbidden')
  })

  it('max_results パラメータが URL に含まれる', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeXApiResponse([]))
    vi.stubGlobal('fetch', mockFetch)

    await fetchTweetMetrics({ ...BASE_PARAMS, max_results: 50 })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('max_results=50')
  })

  it('max_results は 100 を超えないようにクランプされる', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeXApiResponse([]))
    vi.stubGlobal('fetch', mockFetch)

    await fetchTweetMetrics({ ...BASE_PARAMS, max_results: 999 })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('max_results=100')
  })
})
