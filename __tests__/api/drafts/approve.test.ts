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
 * approve/route.ts は drafts テーブルを user_id で直接所有権確認する。
 * from('drafts').eq('user_id', user.id) のシンプルなフロー（RLS + user_id 直接チェック）。
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

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('存在しないidの場合は404を返す', async () => {
    // Arrange: drafts は PGRST116 エラーを返す（user_id 直接チェック）
    const mockQueryBuilder = {
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      }),
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

    const request = new Request('http://localhost/api/drafts/non-existent/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('non-existent'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '見つかりません' },
      { status: 404 }
    )
  })

  it('既にpostedのドラフトは409を返す', async () => {
    // Arrange: アトミック遷移のフロー（user_id 直接チェック）
    // 1回目のupdate (pending→processing): PGRST116で0件（すでにposted）
    // 2回目のselect (現状確認): posted を返す
    const postedDraft = {
      id: 'draft-1',
      status: 'posted',
      posted_tweet_id: 'tweet-123',
    }
    // claim用: update().eq().eq().eq().select().single() → PGRST116 (0行更新)
    const mockClaimBuilder = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      }),
    }
    // fetch用: select().eq().eq().single() → posted ドラフトを返す
    const mockFetchBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: postedDraft, error: null }),
    }
    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((_table: string) => {
        // drafts: 最初はupdate (claim), 次はselect (fetch)
        fromCallCount++
        if (fromCallCount === 1) {
          return { update: vi.fn().mockReturnValue(mockClaimBuilder) }
        }
        return mockFetchBuilder
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'すでに投稿済みです' },
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
      // 1回目: ドラフト取得（claim）、2回目: 更新後のドラフト取得
      if (selectCallCount === 1) return Promise.resolve({ data: pendingDraft, error: null })
      return Promise.resolve({ data: updatedDraft, error: null })
    })
    // drafts テーブルのみ使用（user_id 直接チェック）
    const mockDraftsBuilder = {
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
      from: vi.fn().mockReturnValue(mockDraftsBuilder),
    } as any)

    mockPostTweet.mockResolvedValue({ id: 'tweet-456', text: 'Hello' })

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert
    expect(mockPostTweet).toHaveBeenCalledWith({ text: 'Hello', replyToId: undefined })
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted', posted_tweet_id: 'tweet-456' })
    )
  })

  it('reply種別のドラフトは source_tweet_id を replyToId として渡す', async () => {
    // Arrange
    const replyDraft = {
      id: 'draft-2',
      content: 'Reply content',
      status: 'pending',
      type: 'reply',
      source_tweet_id: 'original-tweet-id',
    }
    const updatedDraft = {
      ...replyDraft,
      status: 'posted',
      posted_tweet_id: 'reply-tweet-id',
    }
    let selectCallCount = 0
    const mockSingle = vi.fn().mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) return Promise.resolve({ data: replyDraft, error: null })
      return Promise.resolve({ data: updatedDraft, error: null })
    })
    const mockDraftsBuilder = {
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
      from: vi.fn().mockReturnValue(mockDraftsBuilder),
    } as any)

    mockPostTweet.mockResolvedValue({ id: 'reply-tweet-id', text: 'Reply content' })

    const request = new Request('http://localhost/api/drafts/draft-2/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-2'))

    // Assert: replyToId が渡されていること
    expect(mockPostTweet).toHaveBeenCalledWith({
      text: 'Reply content',
      replyToId: 'original-tweet-id',
    })
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted', posted_tweet_id: 'reply-tweet-id' })
    )
  })

  it('X API失敗時は422を返し、DBのstatusはpendingのまま', async () => {
    // Arrange
    const pendingDraft = { id: 'draft-1', content: 'Hello', status: 'pending' }
    const mockUpdate = vi.fn().mockReturnThis()
    // drafts テーブルのみ使用（user_id 直接チェック）
    const mockDraftsBuilder = {
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
      from: vi.fn().mockReturnValue(mockDraftsBuilder),
    } as any)

    mockPostTweet.mockRejectedValue(new Error('X API connection failed'))

    const request = new Request('http://localhost/api/drafts/draft-1/approve', {
      method: 'POST',
    })

    // Act
    await POST(request, makeParams('draft-1'))

    // Assert
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
