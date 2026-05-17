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

vi.mock('@/lib/subscription', () => ({
  getUserPlan: vi.fn(() => Promise.resolve('pro')),
  getPlanLimits: vi.fn(() => ({ aiGenerationsPerMonth: 100, xAccounts: 3, scheduledPostsPerMonth: Infinity, templates: Infinity, autoPlugRules: 3, evergreenRules: 3, teamMembers: 1, analyticsDays: 90 })),
  canUseFeature: vi.fn(() => true),
  getMonthlyAiLimit: vi.fn(() => 100),
}))

import { GET, POST } from '@/app/api/schedule/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/schedule', () => {
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

    await GET()
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みの場合はスケジュール一覧を返す', async () => {
    const scheduled = [
      { id: 'd-1', scheduled_at: '2026-05-17T10:00:00Z', status: 'scheduled' },
    ]
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
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: scheduled, error: null }),
      }),
    } as any)

    await GET()
    expect(mockNextResponseJson).toHaveBeenCalledWith(scheduled)
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
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
      }),
    } as any)

    await GET()
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  })
})

describe('POST /api/schedule', () => {
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

    const request = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: 'd-1', scheduled_at: '2026-05-17T10:00:00Z' }),
    })
    await POST(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('scheduled_atが文字列以外の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: 'd-1', scheduled_at: 12345 }),
    })
    await POST(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'scheduled_at は文字列で指定してください' },
      { status: 400 }
    )
  })

  it('認証済みの場合は201とスケジュールデータを返す', async () => {
    // drafts の UPDATE で scheduled_at と status='scheduled' をセット
    const updated = { id: 'd-1', scheduled_at: '2026-05-17T10:00:00Z', status: 'scheduled' }
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

    const request = new Request('http://localhost/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: 'd-1', scheduled_at: '2026-05-17T10:00:00Z' }),
    })
    await POST(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(updated, { status: 201 })
  })
})
