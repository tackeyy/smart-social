import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

// lib/supabase/server をモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { GET } from '@/app/api/x/timeline/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

/**
 * GET /api/x/timeline のテスト（TDD Red フェーズ）
 *
 * 対象ファイル: app/api/x/timeline/route.ts
 * ※ 実装はまだ存在しない。テストが失敗することを確認すること（Red）。
 *
 * 仕様:
 * - 認証済みユーザーの X アカウント情報を Supabase から取得
 * - X API v2 homeTimeline でツイートを取得（デフォルト max_results=50）
 * - ?max_results=<n> クエリパラメータで取得件数を指定可能
 */
describe('GET /api/x/timeline', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/x/timeline')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('正常系: X APIからツイート一覧を返す（max_results=50 デフォルト）', async () => {
    // Arrange
    const mockTweets = [
      { id: 'tweet-1', text: 'Hello World 1', created_at: '2026-03-28T00:00:00Z' },
      { id: 'tweet-2', text: 'Hello World 2', created_at: '2026-03-28T01:00:00Z' },
    ]

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    // X API v2 のレスポンスをモック
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: mockTweets,
        meta: { result_count: 2, newest_id: 'tweet-2', oldest_id: 'tweet-1' },
      }),
    })

    const request = new Request('http://localhost/api/x/timeline')

    // Act
    await GET(request)

    // Assert: X API が max_results=50 で呼ばれていること
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('max_results=50'),
      expect.any(Object)
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ data: mockTweets })
    )
  })

  it('?max_results=100 クエリパラメータで100件取得', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `tweet-${i}`,
          text: `Tweet ${i}`,
        })),
        meta: { result_count: 100 },
      }),
    })

    const request = new Request('http://localhost/api/x/timeline?max_results=100')

    // Act
    await GET(request)

    // Assert: X API が max_results=100 で呼ばれていること
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('max_results=100'),
      expect.any(Object)
    )
  })

  it('X APIが失敗した場合は502を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    // X API がエラーを返す
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        errors: [{ message: 'Service Unavailable' }],
      }),
    })

    const request = new Request('http://localhost/api/x/timeline')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 502 }
    )
  })

  it('不正な pagination_token が指定された場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/x/timeline?pagination_token=<script>alert(1)</script>')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '無効な pagination_token です' },
      { status: 400 }
    )
  })

  it('X アカウントが未連携の場合は404を返す', async () => {
    // Arrange: x_accounts テーブルにレコードなし
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/x/timeline')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 404 }
    )
  })

  it('?pagination_token が指定された場合、X API URL に pagination_token が含まれる', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        meta: { result_count: 0, next_token: 'next-page-token-xyz' },
      }),
    })

    const request = new Request('http://localhost/api/x/timeline?pagination_token=prev-token-abc')

    // Act
    await GET(request)

    // Assert: X API に pagination_token が渡されること
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('pagination_token=prev-token-abc'),
      expect.any(Object)
    )
  })

  it('X API が next_token を返した場合、レスポンスの meta に含まれる', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ x_user_id: 'x-user-123', access_token: 'token-abc' }],
          error: null,
        }),
      }),
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'tweet-1', text: 'Hello' }],
        meta: { result_count: 1, next_token: 'next-page-token-xyz' },
      }),
    })

    const request = new Request('http://localhost/api/x/timeline')

    // Act
    await GET(request)

    // Assert: レスポンスに meta.next_token が含まれること
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ next_token: 'next-page-token-xyz' }),
      })
    )
  })
})
