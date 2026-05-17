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
  getUserPlan: vi.fn(() => Promise.resolve('business')),
  getPlanLimits: vi.fn(() => ({ aiGenerationsPerMonth: Infinity, xAccounts: 10, scheduledPostsPerMonth: Infinity, templates: Infinity, autoPlugRules: Infinity, evergreenRules: Infinity, teamMembers: 5, analyticsDays: 365 })),
  canUseFeature: vi.fn(() => true),
  getMonthlyAiLimit: vi.fn(() => Infinity),
}))

import { GET, POST } from '@/app/api/evergreen/rules/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

const validPostBody = {
  x_account_id: 1,
  source_tweet_id: '1234567890',
  source_content: 'テストツイートの内容',
  interval_days: 30,
}

function makeSupabaseWithAccount(userId = 'user-1') {
  // from() を呼び出しごとに異なるモックチェーンを返す必要があるため、
  // call count で分岐する実装にする
  let callCount = 0
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // x_accounts 所有権チェック
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
        }
      }
      if (callCount === 2) {
        // 重複チェック
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }
      }
      // insert
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'rule-new' }, error: null }),
      }
    }),
  }
}

describe('GET /api/evergreen/rules', () => {
  beforeEach(() => { vi.resetAllMocks() })

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

  it('認証済みの場合はルール一覧を返す', async () => {
    const rules = [{ id: 'rule-1' }]
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

    await GET()
    expect(mockNextResponseJson).toHaveBeenCalledWith(rules)
  })
})

describe('POST /api/evergreen/rules', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify(validPostBody),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('x_account_id が他ユーザーのものの場合は403を返す（IDORチェック）', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, x_account_id: 999 }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 403 }
    )
  })

  it('source_tweet_id が数字以外の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, source_tweet_id: 'invalid-tweet-id' }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('prefix_pool が配列でない場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, prefix_pool: 'not-an-array' }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('prefix_pool が20件超の場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, prefix_pool: Array(21).fill('prefix') }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('prefix_pool に50文字超の要素がある場合は400を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, prefix_pool: ['a'.repeat(51)] }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('正常なリクエストでは201とルールを返す', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseWithAccount() as any)

    const req = new Request('http://localhost/api/evergreen/rules', {
      method: 'POST',
      body: JSON.stringify({ ...validPostBody, prefix_pool: ['おはようございます'] }),
    })
    await POST(req)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rule-new' }),
      { status: 201 }
    )
  })
})
