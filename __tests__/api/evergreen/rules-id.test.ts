import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
  // DELETE で使用する NextResponse コンストラクタ相当
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { PATCH } from '@/app/api/evergreen/rules/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

const routeParams = { params: Promise.resolve({ id: 'rule-1' }) }

function makeAuthenticatedSupabase(updateResult = { data: { id: 'rule-1' }, error: null }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(updateResult),
    }),
  }
}

describe('PATCH /api/evergreen/rules/[id]', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('enabled が真偽値でない場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: 'yes' }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('max_runs が0の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ max_runs: 0 }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('max_runs が小数の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ max_runs: 1.5 }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('max_runs が null の場合は許容される', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ max_runs: null }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rule-1' })
    )
  })

  it('prefix_pool が配列でない場合は400を返す（PATCH）', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ prefix_pool: 'not-an-array' }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('prefix_pool に50文字超の要素がある場合は400を返す（PATCH）', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ prefix_pool: ['a'.repeat(51)] }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('正常なリクエストでは更新結果を返す', async () => {
    mockCreateClient.mockResolvedValue(makeAuthenticatedSupabase() as any)

    const req = new Request('http://localhost/api/evergreen/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false, max_runs: 5 }),
    })
    await PATCH(req, routeParams)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rule-1' })
    )
  })
})
