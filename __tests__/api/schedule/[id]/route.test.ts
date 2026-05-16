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

import { DELETE, PATCH } from '@/app/api/schedule/[id]/route'
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

  it('認証済みの場合は204を返す（scheduled → pending にリセット）', async () => {
    // scheduled_posts DELETE ではなく drafts の scheduled_at をクリアして pending に戻す
    const updatedDraft = { id: '1', status: 'pending', scheduled_at: null }
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
        single: vi.fn().mockResolvedValue({ data: updatedDraft, error: null }),
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
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', { method: 'DELETE' })
    await DELETE(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  })
})

describe('PATCH /api/schedule/[id]', () => {
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

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: new Date(Date.now() + 86400000).toISOString() }),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('scheduled_atが未指定の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('過去の日時の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: '2020-01-01T00:00:00Z' }),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('有効な日時の場合は200と更新済みドラフトを返す', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const updatedDraft = { id: '1', status: 'scheduled', scheduled_at: futureDate }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedDraft, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: futureDate }),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(updatedDraft)
  })

  it('ドラフトが見つからない場合は404を返す', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: futureDate }),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 404 }
    )
  })

  it('DBエラーの場合は500を返す', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      }),
    } as any)

    const request = new Request('http://localhost/api/schedule/1', {
      method: 'PATCH',
      body: JSON.stringify({ scheduled_at: futureDate }),
    })
    await PATCH(request, makeParams('1'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  })
})
