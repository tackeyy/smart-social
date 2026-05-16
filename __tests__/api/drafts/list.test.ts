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

import { GET } from '@/app/api/drafts/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/drafts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange: auth.getUser がuserなしを返す
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('認証済みの場合はdrafts(type=reply)一覧を返す', async () => {
    // Arrange
    const mockDrafts = [
      { id: 'draft-1', type: 'reply', source_tweet_id: 'tweet-1', x_account_id: 1, created_at: '2024-01-01' },
      { id: 'draft-2', type: 'reply', source_tweet_id: 'tweet-2', x_account_id: 1, created_at: '2024-01-02' },
    ]

    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockDrafts, error: null }),
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

    const request = new Request('http://localhost/api/drafts')

    // Act
    await GET(request)

    // Assert: type='reply' で絞り込まれること
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('type', 'reply')
    expect(mockNextResponseJson).toHaveBeenCalledWith(mockDrafts)
  })

  it('?status=pendingで絞り込まれたdraftsを返す', async () => {
    // Arrange
    const pendingDrafts = [
      { id: 'draft-1', type: 'reply', source_tweet_id: 'tweet-1', x_account_id: 1, created_at: '2024-01-01' },
    ]
    const mockDraftsQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: pendingDrafts, error: null }),
    }

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockDraftsQueryBuilder),
    } as any)

    const request = new Request('http://localhost/api/drafts?status=pending')

    // Act
    await GET(request)

    // Assert
    expect(mockDraftsQueryBuilder.eq).toHaveBeenCalledWith('status', 'pending')
    expect(mockNextResponseJson).toHaveBeenCalledWith(pendingDrafts)
  })
})
