import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => {
  function MockNextResponse(body: unknown, init?: ResponseInit) {
    return { body, status: init?.status ?? 200 }
  }
  MockNextResponse.json = vi.fn((body: unknown, init?: ResponseInit) => ({
    body,
    status: init?.status ?? 200,
    json: async () => body,
  }))
  return { NextResponse: MockNextResponse }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { DELETE } from '@/app/api/schedule/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/schedule/[id]', () => {
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

    const request = new Request('http://localhost/api/schedule/1', { method: 'DELETE' })
    await DELETE(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みの場合は204を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', { method: 'DELETE' })
    const response = await DELETE(request, makeParams('1'))
    expect((response as unknown as { status: number }).status).toBe(204)
  })

  it('DBエラーの場合は500を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', { method: 'DELETE' })
    await DELETE(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'db error' },
      { status: 500 }
    )
  })
})
