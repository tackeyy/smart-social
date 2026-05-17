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

import { GET } from '@/app/api/usage/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

const mockUsageRows = [
  { endpoint: 'drafts_generate', model: 'claude-sonnet-4-6', input_tokens: 500, output_tokens: 200, cost_usd: '0.0045', created_at: '2026-05-10T10:00:00Z' },
  { endpoint: 'precheck', model: 'claude-haiku-4-5-20251001', input_tokens: 100, output_tokens: 50, cost_usd: '0.000280', created_at: '2026-05-11T10:00:00Z' },
  { endpoint: 'profile_generate', model: 'claude-sonnet-4-6', input_tokens: 800, output_tokens: 300, cost_usd: '0.0069', created_at: '2026-05-12T10:00:00Z' },
]

describe('GET /api/usage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/usage')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('当月の使用量集計を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockUsageRows, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/usage')
    await GET(request)

    const call = mockNextResponseJson.mock.calls[0][0] as Record<string, unknown>
    expect(call.month).toMatch(/^\d{4}-\d{2}$/)
    expect(call.total_input_tokens).toBe(1400)
    expect(call.total_output_tokens).toBe(550)
    expect(typeof call.total_cost_usd).toBe('number')
    expect(Array.isArray(call.by_endpoint)).toBe(true)
  })

  it('?month=2026-04 を指定すると指定月のデータを返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/usage?month=2026-04')
    await GET(request)

    const call = mockNextResponseJson.mock.calls[0][0] as Record<string, unknown>
    expect(call.month).toBe('2026-04')
    expect(call.total_input_tokens).toBe(0)
  })

  it('by_endpoint に endpoint 別の集計が含まれる', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockUsageRows, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/usage')
    await GET(request)

    const call = mockNextResponseJson.mock.calls[0][0] as { by_endpoint: Array<{ endpoint: string; calls: number }> }
    const drafts = call.by_endpoint.find(e => e.endpoint === 'drafts_generate')
    expect(drafts?.calls).toBe(1)
    expect(call.by_endpoint.length).toBe(3)
  })
})
