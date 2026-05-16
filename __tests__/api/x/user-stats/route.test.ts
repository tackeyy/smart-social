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

import { GET } from '@/app/api/x/user-stats/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/x/user-stats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('X_BEARER_TOKEN', 'test-bearer-token')
  })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/x/user-stats')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('X APIが正常に返した場合はユーザー統計を返す', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'xu-1',
          public_metrics: {
            followers_count: 1000,
            following_count: 500,
            tweet_count: 2000,
            listed_count: 50,
          },
        },
      }),
    })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 1, x_user_id: 'xu-1' }],
          error: null,
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/x/user-stats')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith({
      followers_count: 1000,
      following_count: 500,
      tweet_count: 2000,
      listed_count: 50,
    })
  })
})
