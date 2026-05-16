import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server のNextResponseをモック
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

// lib/x/client をモック
vi.mock('@/lib/x/client', () => ({
  postTweet: vi.fn(),
}))

import { POST } from '@/app/api/drafts/[id]/approve/route'
import { createClient } from '@/lib/supabase/server'
import { postTweet } from '@/lib/x/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockPostTweet = vi.mocked(postTweet)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

/**
 * 現在の実装 (app/api/drafts/[id]/approve/route.ts) は認証・X API呼び出しを持たない。
 * これらのテストは TDD の Red フェーズとして、実装が完了するまで失敗し続ける。
 *
 * 期待する実装フロー:
 * 1. auth.getUser() でユーザー認証チェック → 未認証は401
 * 2. drafts テーブルから id で1件取得 → 存在しない場合は404
 * 3. status === 'posted' なら409
 * 4. postTweet() を呼び出し → 失敗なら422、DBはpendingのまま
 * 5. 成功したら status=posted, posted_tweet_id を更新して返す
 */
describe('POST /api/drafts/[id]/approve', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange: authチェックでuserがnullを返す
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert: 認証チェックがない実装では401が返らないのでFailする（Red）
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('存在しないidの場合は404を返す', async () => {
    // Arrange: Supabase が PGRST116 エラーを返す（行が見つからない）
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/non-existent/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('non-existent'))

    // Assert: 存在チェックがない実装では404が返らないのでFailする（Red）
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Not Found' },
      { status: 404 }
    )
  })

  it('既にpostedのドラフトは409を返す', async () => {
    // Arrange: すでにpostedのドラフトをDBが返す
    const postedDraft = {
      id: 'draft-1',
      content: 'Hello',
      status: 'posted',
      posted_tweet_id: 'tweet-123',
    }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: postedDraft, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert: statusチェックがない実装では409が返らないのでFailする（Red）
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Already posted' },
      { status: 409 }
    )
  })

  it('X API投稿成功時はstatus=postedとposted_tweet_idが設定される', async () => {
    // Arrange
    const pendingDraft = { id: 'draft-1', content: 'Hello', status: 'pending' }
    const updatedDraft = {
      id: 'draft-1',
      content: 'Hello',
      status: 'posted',
      posted_tweet_id: 'tweet-456',
    }
    let selectCallCount = 0
    const mockSingle = vi.fn().mockImplementation(() => {
      selectCallCount++
      // 1回目: ドラフト取得、2回目: 更新後のドラフト取得
      if (selectCallCount === 1) return Promise.resolve({ data: pendingDraft, error: null })
      return Promise.resolve({ data: updatedDraft, error: null })
    })
    const mockQueryBuilder = {
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any)

    mockPostTweet.mockResolvedValue({ id: 'tweet-456', text: 'Hello' })

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert: X API呼び出しと posted_tweet_id 設定がない実装ではFailする（Red）
    expect(mockPostTweet).toHaveBeenCalledWith({ text: 'Hello' })
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted', posted_tweet_id: 'tweet-456' })
    )
  })

  it('X API失敗時は422を返し、DBのstatusはpendingのまま', async () => {
    // Arrange
    const pendingDraft = { id: 'draft-1', content: 'Hello', status: 'pending' }
    const mockUpdate = vi.fn().mockReturnThis()
    const mockQueryBuilder = {
      update: mockUpdate,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: pendingDraft, error: null }),
    }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any)

    mockPostTweet.mockRejectedValue(new Error('X API connection failed'))

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert: X API失敗時の422ハンドリングがない実装ではFailする（Red）
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 422 }
    )
    // 成功時のupdate（posted）が呼ばれていないこと
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted' })
    )
  })
})
