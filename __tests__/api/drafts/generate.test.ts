import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// lib/claude/client をモック（M-2: createAnthropicハック削除に対応）
vi.mock('@/lib/claude/client', () => ({
  generateStyleProfile: vi.fn(),
  generateDraftCandidates: vi.fn(),
}))

import { POST } from '@/app/api/drafts/generate/route'
import { createClient } from '@/lib/supabase/server'
import { generateDraftCandidates } from '@/lib/claude/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockGenerateDraftCandidates = vi.mocked(generateDraftCandidates)

/**
 * POST /api/drafts/generate のテスト
 *
 * 対象ファイル: app/api/drafts/generate/route.ts
 *
 * 仕様:
 * - リクエストボディに x_account_id と source_tweet_url（またはtweet_id）を受け取る
 * - style_profiles テーブルからユーザーの文体プロファイルを取得（未生成なら404）
 * - lib/claude/client の generateDraftCandidates でリプライドラフトを3候補生成
 * - reply_drafts テーブルに保存して返す
 */
describe('POST /api/drafts/generate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        source_tweet_url: 'https://x.com/i/status/123456',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('style_profile が未生成の場合は404を返す（先にプロファイル生成が必要）', async () => {
    // Arrange: style_profiles にレコードなし
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
            single: vi.fn().mockResolvedValue({
              data: { id: 'account-1', user_id: 'user-1' },
              error: null,
            }),
          }
        }
        if (table === 'style_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            // プロファイルが存在しない
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Row not found' },
            }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        source_tweet_url: 'https://x.com/i/status/123456',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.stringMatching(/profile|プロファイル/i) },
      { status: 404 }
    )
  })

  it('正常系: Claude APIで3候補生成→reply_draftsに保存', async () => {
    // Arrange
    const mockProfile = {
      id: 'profile-1',
      x_account_id: 'account-1',
      profile_data: {
        tone: 'professional',
        emoji_usage: 'rare',
        avg_length: 100,
        patterns: ['AI', 'テクノロジー'],
        sample_phrases: ['革新的な'],
      },
    }

    const mockDraftCandidates = [
      '候補1のドラフトテキスト',
      '候補2のドラフトテキスト',
      '候補3のドラフトテキスト',
    ]

    // generateDraftCandidates が3候補を返す
    mockGenerateDraftCandidates.mockResolvedValue(mockDraftCandidates)

    const mockInsert = vi.fn().mockResolvedValue({
      data: mockDraftCandidates.map((text, i) => ({
        id: `draft-${i + 1}`,
        content: text,
        status: 'pending',
      })),
      error: null,
    })

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
            single: vi.fn().mockResolvedValue({
              data: { id: 'account-1', user_id: 'user-1' },
              error: null,
            }),
          }
        }
        if (table === 'style_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'reply_drafts') {
          return { insert: mockInsert }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        source_tweet_url: 'https://x.com/i/status/123456',
      }),
    })

    // Act
    await POST(request)

    // Assert: generateDraftCandidates が呼ばれたこと
    expect(mockGenerateDraftCandidates).toHaveBeenCalledOnce()
    // Assert: reply_drafts への INSERT が呼ばれたこと
    expect(mockInsert).toHaveBeenCalledOnce()
    // Assert: 3候補が返ること
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        drafts: expect.arrayContaining([
          expect.objectContaining({ content: expect.any(String) }),
        ]),
      })
    )
  })

  it('正常系: 生成されたドラフトは3件であること', async () => {
    // Arrange
    const mockProfile = {
      id: 'profile-1',
      x_account_id: 'account-1',
      profile_data: { tone: 'casual' },
    }
    const mockDrafts = [
      { id: 'draft-1', content: '候補1', status: 'pending' },
      { id: 'draft-2', content: '候補2', status: 'pending' },
      { id: 'draft-3', content: '候補3', status: 'pending' },
    ]

    mockGenerateDraftCandidates.mockResolvedValue(['候補1', '候補2', '候補3'])

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
            single: vi.fn().mockResolvedValue({
              data: { id: 'account-1', user_id: 'user-1' },
              error: null,
            }),
          }
        }
        if (table === 'style_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        if (table === 'reply_drafts') {
          return {
            insert: vi.fn().mockResolvedValue({ data: mockDrafts, error: null }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        source_tweet_url: 'https://x.com/i/status/123456',
      }),
    })

    // Act
    await POST(request)

    // Assert: ちょうど3件のドラフトが返る
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        drafts: expect.arrayContaining([
          expect.objectContaining({ content: '候補1' }),
          expect.objectContaining({ content: '候補2' }),
          expect.objectContaining({ content: '候補3' }),
        ]),
      })
    )
    const callArg = mockNextResponseJson.mock.calls[0][0] as { drafts: unknown[] }
    expect(callArg.drafts).toHaveLength(3)
  })

  it('Claude API が失敗した場合は500を返す', async () => {
    // Arrange
    const mockProfile = {
      id: 'profile-1',
      x_account_id: 'account-1',
      profile_data: { tone: 'casual' },
    }

    // generateDraftCandidates がエラーをスロー
    mockGenerateDraftCandidates.mockRejectedValue(new Error('Claude API internal error'))

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
            single: vi.fn().mockResolvedValue({
              data: { id: 'account-1', user_id: 'user-1' },
              error: null,
            }),
          }
        }
        if (table === 'style_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        source_tweet_url: 'https://x.com/i/status/123456',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('異常系: リクエストボディが不正な場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/drafts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // x_account_id も source_tweet_url もなし
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
