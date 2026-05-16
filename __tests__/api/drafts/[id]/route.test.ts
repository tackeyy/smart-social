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

import { GET, PATCH, DELETE } from '@/app/api/drafts/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function mockUnauthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
  } as any)
}

describe('GET /api/drafts/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    mockUnauthenticated()
    const request = new Request('http://localhost/api/drafts/draft-1')
    await GET(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みの場合はドラフトデータを返す', async () => {
    const draft = { id: 'draft-1', content: 'Hello', status: 'pending' }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: draft, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1')
    await GET(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(draft)
  })

  it('DBエラーの場合は404を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1')
    await GET(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'ドラフトが見つかりません' },
      { status: 404 }
    )
  })
})

describe('PATCH /api/drafts/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    mockUnauthenticated()
    const request = new Request('http://localhost/api/drafts/draft-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated' }),
    })
    await PATCH(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みの場合は更新済みデータを返す', async () => {
    const updated = { id: 'draft-1', content: 'updated', status: 'pending' }
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
        single: vi.fn().mockResolvedValue({ data: updated, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated' }),
    })
    await PATCH(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(updated)
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
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated' }),
    })
    await PATCH(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  })

  it('更新可能なフィールドがない場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'attacker', status: 'posted' }),
    })
    await PATCH(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '更新可能なフィールドがありません' },
      { status: 400 }
    )
  })
})

describe('DELETE /api/drafts/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    mockUnauthenticated()
    const request = new Request('http://localhost/api/drafts/draft-1', { method: 'DELETE' })
    await DELETE(request, makeParams('draft-1'))
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
        eq: vi.fn().mockReturnThis(),
        // チェーンの最後（.eq('user_id', ...) の後）は Promise を返す
      }),
    } as any)

    // 2つ目の eq が await 対象になるので、mockReturnThis() では不十分
    // eq チェーンが2回呼ばれ、最後の eq が { error: null } を返す必要がある
    const mockEq = vi.fn()
    mockEq
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1', { method: 'DELETE' })
    const response = await DELETE(request, makeParams('draft-1'))
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
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
          }),
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/draft-1', { method: 'DELETE' })
    await DELETE(request, makeParams('draft-1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  })
})
