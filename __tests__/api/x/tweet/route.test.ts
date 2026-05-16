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
  deleteTweet: vi.fn(),
}))

import { DELETE } from '@/app/api/x/tweet/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { deleteTweet } from '@/lib/x/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockDeleteTweet = vi.mocked(deleteTweet)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/x/tweet/[id]', () => {
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

    const request = new Request('http://localhost/api/x/tweet/tweet-123', { method: 'DELETE' })
    await DELETE(request, makeParams('tweet-123'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みで削除成功の場合は200を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'draft-1' }, error: null }),
      }),
    } as any)
    mockDeleteTweet.mockResolvedValue({ deleted: true })

    const request = new Request('http://localhost/api/x/tweet/tweet-123', { method: 'DELETE' })
    await DELETE(request, makeParams('tweet-123'))
    expect(mockDeleteTweet).toHaveBeenCalledWith('tweet-123')
    expect(mockNextResponseJson).toHaveBeenCalledWith({ deleted: true })
  })

  it('X APIエラーの場合は422を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)
    mockDeleteTweet.mockRejectedValue(new Error('Tweet not found'))

    const request = new Request('http://localhost/api/x/tweet/tweet-123', { method: 'DELETE' })
    await DELETE(request, makeParams('tweet-123'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 422 }
    )
  })
})
