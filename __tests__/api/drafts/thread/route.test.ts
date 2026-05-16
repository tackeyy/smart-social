import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/x/client', () => ({
  postThread: vi.fn(),
}))

import { POST } from '@/app/api/drafts/thread/route'
import { createClient } from '@/lib/supabase/server'
import { postThread } from '@/lib/x/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockPostThread = vi.mocked(postThread)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/drafts/thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeInvalidRequest(): Request {
  return new Request('http://localhost/api/drafts/thread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json{{{',
  })
}

describe('POST /api/drafts/thread', () => {
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

    const request = makeRequest({ x_account_id: 1, tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('リクエストボディが不正なJSONの場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = makeInvalidRequest()
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'リクエストの形式が不正です' },
      { status: 400 }
    )
  })

  it('x_account_id が欠損している場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = makeRequest({ tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'アカウントIDは必須です' },
      { status: 400 }
    )
  })

  it('tweets が1件以下の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = makeRequest({ x_account_id: 1, tweets: ['only one tweet'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'tweets must be an array of 2–10 items' },
      { status: 400 }
    )
  })

  it('tweets が11件以上の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const tooManyTweets = Array.from({ length: 11 }, (_, i) => `tweet ${i + 1}`)
    const request = makeRequest({ x_account_id: 1, tweets: tooManyTweets })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'tweets must be an array of 2–10 items' },
      { status: 400 }
    )
  })

  it('tweets が配列でない場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = makeRequest({ x_account_id: 1, tweets: 'not an array' })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'tweets must be an array of 2–10 items' },
      { status: 400 }
    )
  })

  it('x_account_id がユーザーのものでない場合は403を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as any)

    const request = makeRequest({ x_account_id: 999, tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'アクセス権限がありません' },
      { status: 403 }
    )
  })

  it('postThread が失敗した場合は422を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      })),
    } as any)

    mockPostThread.mockRejectedValue(new Error('X API connection failed'))

    const request = makeRequest({ x_account_id: 1, tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'X API connection failed' },
      { status: 422 }
    )
  })

  it('正常系: postThread 成功 + DB insert 成功 → 201', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }
        }
        // drafts
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }),
    } as any)

    mockPostThread.mockResolvedValue({ tweet_ids: ['111', '222'] })

    const request = makeRequest({ x_account_id: 1, tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { tweet_ids: ['111', '222'] },
      { status: 201 }
    )
  })

  it('正常系: postThread 成功 + DB insert 失敗 → 200 + warning', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }
        }
        // drafts insert 失敗
        return {
          insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }
      }),
    } as any)

    mockPostThread.mockResolvedValue({ tweet_ids: ['111', '222'] })

    const request = makeRequest({ x_account_id: 1, tweets: ['tweet1', 'tweet2'] })
    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { tweet_ids: ['111', '222'], warning: 'DB sync failed' },
      { status: 200 }
    )
  })
})
