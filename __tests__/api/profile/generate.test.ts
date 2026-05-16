import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

// lib/supabase/server をモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remainingSec: 0 })),
}))

// lib/claude/client をモック（M-2: createAnthropicハック削除に対応）
vi.mock('@/lib/claude/client', () => ({
  generateStyleProfile: vi.fn(),
  generateDraftCandidates: vi.fn(),
}))

import { POST } from '@/app/api/profile/generate/route'
import { createClient } from '@/lib/supabase/server'
import { generateStyleProfile } from '@/lib/claude/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockGenerateStyleProfile = vi.mocked(generateStyleProfile)

/**
 * POST /api/profile/generate のテスト
 *
 * 対象ファイル: app/api/profile/generate/route.ts
 *
 * 仕様:
 * - リクエストボディに x_account_id を受け取る
 * - 認証済みユーザーの X アカウントのツイート履歴を取得
 * - lib/claude/client の generateStyleProfile で文体プロファイルを生成
 * - style_profiles テーブルに保存
 */
describe('POST /api/profile/generate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('X_BEARER_TOKEN', 'test-bearer-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/profile/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('x_account_id が自分のものでない場合は403を返す', async () => {
    // Arrange: ユーザーは認証済みだが、指定された x_account_id は別ユーザーのもの
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // user_id が user-1 でない（別ユーザーのアカウント）
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-other-user' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 403 }
    )
  })

  it('正常系: X APIでツイート取得→Claude APIで文体プロファイル生成→style_profilesに保存', async () => {
    // Arrange
    const mockAccount = {
      id: 'account-1',
      user_id: 'user-1',
      x_user_id: 'x-user-123',
      access_token: 'token-abc',
    }

    const mockTweets = [
      { id: 'tweet-1', text: 'テストツイート1' },
      { id: 'tweet-2', text: 'テストツイート2' },
    ]

    const mockProfile = {
      tone: 'professional',
      vocabulary: ['テクノロジー', 'AI', '革新'],
      sentence_style: '簡潔で論理的',
    }

    // X API のレスポンスをモック
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockTweets }),
    })

    // lib/claude/client の generateStyleProfile をモック
    mockGenerateStyleProfile.mockResolvedValue(mockProfile as any)

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
          }
        }
        if (table === 'style_profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ data: [{ id: 'profile-1' }], error: null }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1' }),
    })

    // Act
    await POST(request)

    // Assert: generateStyleProfile が呼ばれたこと
    expect(mockGenerateStyleProfile).toHaveBeenCalledOnce()
    expect(mockGenerateStyleProfile).toHaveBeenCalledWith(['テストツイート1', 'テストツイート2'])
    // Assert: style_profiles への保存が呼ばれたこと
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ profile: expect.any(Object) })
    )
  })

  it('Claude API が失敗した場合は500を返す', async () => {
    // Arrange
    const mockAccount = {
      id: 'account-1',
      user_id: 'user-1',
      x_user_id: 'x-user-123',
      access_token: 'token-abc',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'tweet-1', text: 'テスト' }] }),
    })

    // generateStyleProfile がエラーをスロー
    mockGenerateStyleProfile.mockRejectedValue(new Error('Claude API overloaded'))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'x_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAccount, error: null }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('異常系: リクエストボディに x_account_id が含まれない場合は400を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/profile/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // x_account_id なし
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })
})
