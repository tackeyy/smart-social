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

import { GET, POST } from '@/app/api/auto-plug/rules/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/auto-plug/rules', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    await GET(new Request('http://localhost/api/auto-plug/rules'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('認証済みの場合はルール一覧を返す', async () => {
    const rules = [{ id: 'rule-1', threshold_type: 'likes', threshold_value: 50 }]
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: rules, error: null }),
      }),
    } as any)

    await GET(new Request('http://localhost/api/auto-plug/rules'))
    expect(mockNextResponseJson).toHaveBeenCalledWith(rules)
  })
})

describe('POST /api/auto-plug/rules', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/auto-plug/rules', {
      method: 'POST',
      body: JSON.stringify({ x_account_id: 1, threshold_type: 'likes', threshold_value: 50, template_text: 'test' }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('threshold_value < 10 の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/auto-plug/rules', {
      method: 'POST',
      body: JSON.stringify({ x_account_id: 1, threshold_type: 'likes', threshold_value: 5, template_text: 'test' }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('正常なリクエストでは201とルールを返す', async () => {
    const newRule = { id: 'rule-new', threshold_type: 'likes', threshold_value: 50 }

    let autoPlugCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          // 所有権チェック: アカウントあり
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
          }
        }
        if (table === 'auto_plug_rules') {
          autoPlugCallCount++
          if (autoPlugCallCount === 1) {
            // COUNT チェック: 0件（上限未達）
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }
          }
        }
        // INSERT
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: newRule, error: null }),
        }
      }),
    } as any)

    const req = new Request('http://localhost/api/auto-plug/rules', {
      method: 'POST',
      body: JSON.stringify({ x_account_id: 1, threshold_type: 'likes', threshold_value: 50, template_text: 'フォロワー向けリソースはこちら👇' }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(newRule, { status: 201 })
  })
})
