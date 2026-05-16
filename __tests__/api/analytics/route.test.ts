import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
    {
      json: vi.fn((body: unknown, init?: ResponseInit) => ({
        body,
        status: init?.status ?? 200,
        json: async () => body,
      })),
    }
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/x/analytics', () => ({
  fetchTweetMetrics: vi.fn(),
}))

import { GET } from '@/app/api/analytics/route'
import { createClient } from '@/lib/supabase/server'
import { fetchTweetMetrics } from '@/lib/x/analytics'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockFetchTweetMetrics = vi.mocked(fetchTweetMetrics)

const mockAccount = {
  id: 'account-1',
  x_user_id: 'x_user_123',
  access_token: 'access_token',
  access_token_secret: 'access_secret',
}

function buildSupabaseMock(accounts: typeof mockAccount[] | null) {
  // eq チェーンが可変長になるため、then/eq を両方持つオブジェクトを作る
  const resolvedValue = { data: accounts, error: null }

  // eq を呼ぶたびに自身を返し、かつ await できる (PromiseLike) チェーンオブジェクト
  const mockEqOuter = vi.fn()
  const mockEqInner = vi.fn()

  const chainable: any = {
    then: (resolve: (v: any) => any) => Promise.resolve(resolvedValue).then(resolve),
    eq: mockEqOuter,
  }
  const chainableInner: any = {
    then: (resolve: (v: any) => any) => Promise.resolve(resolvedValue).then(resolve),
    eq: mockEqInner,
  }

  mockEqOuter.mockReturnValue(chainableInner)
  mockEqInner.mockReturnValue(chainableInner)

  const mockSelect = vi.fn().mockReturnValue(chainable)
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: mockFrom,
    __mocks: { mockFrom, mockSelect, mockEqOuter, mockEqInner },
  }
}

describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/analytics')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('X アカウントが未接続（accounts が空）の場合は404を返す', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock([]) as any)

    const request = new Request('http://localhost/api/analytics')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'X account not connected' }),
      { status: 404 }
    )
  })

  it('?x_account_id=123 指定時: eq("id", "123") が追加される', async () => {
    const supabaseMock = buildSupabaseMock([mockAccount])
    mockCreateClient.mockResolvedValue(supabaseMock as any)
    mockFetchTweetMetrics.mockResolvedValue([])

    const request = new Request('http://localhost/api/analytics?x_account_id=123')
    await GET(request)

    // eq が 'user_id' と 'id' の両方で呼ばれることを確認
    expect(supabaseMock.__mocks.mockEqOuter).toHaveBeenCalledWith('user_id', 'user-1')
    expect(supabaseMock.__mocks.mockEqInner).toHaveBeenCalledWith('id', '123')
  })

  it('max_results が指定なしの場合: fetchTweetMetrics に max_results: 20 で呼ばれる', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock([mockAccount]) as any)
    mockFetchTweetMetrics.mockResolvedValue([])

    const request = new Request('http://localhost/api/analytics')
    await GET(request)

    expect(mockFetchTweetMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ max_results: 20 })
    )
  })

  it('max_results=150 の場合: 100 にクランプされる', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock([mockAccount]) as any)
    mockFetchTweetMetrics.mockResolvedValue([])

    const request = new Request('http://localhost/api/analytics?max_results=150')
    await GET(request)

    expect(mockFetchTweetMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ max_results: 100 })
    )
  })

  it('fetchTweetMetrics が失敗（throw）した場合は500を返す', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock([mockAccount]) as any)
    mockFetchTweetMetrics.mockRejectedValue(new Error('X API error'))

    const request = new Request('http://localhost/api/analytics')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'X API error' }),
      { status: 500 }
    )
  })

  it('正常系: metrics が返る場合は200で metrics を返す', async () => {
    const mockMetrics = [
      {
        tweet_id: '111',
        text: 'Hello World',
        created_at: '2024-01-01T00:00:00Z',
        like_count: 10,
        retweet_count: 5,
        reply_count: 2,
        impression_count: 1000,
        engagement_rate: 1.7,
      },
    ]
    mockCreateClient.mockResolvedValue(buildSupabaseMock([mockAccount]) as any)
    mockFetchTweetMetrics.mockResolvedValue(mockMetrics as any)

    const request = new Request('http://localhost/api/analytics')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(mockMetrics)
  })
})
