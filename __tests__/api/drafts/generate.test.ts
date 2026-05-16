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

// Anthropic SDK をモック
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}))

import { POST } from '@/app/api/drafts/generate/route'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const MockAnthropic = vi.mocked(Anthropic)

/**
 * POST /api/drafts/generate のテスト（TDD Red フェーズ）
 *
 * 対象ファイル: app/api/drafts/generate/route.ts
 * ※ 実装はまだ存在しない。テストが失敗することを確認すること（Red）。
 *
 * 仕様:
 * - リクエストボディに x_account_id と source_tweet_url（またはtweet_id）を受け取る
 * - style_profiles テーブルからユーザーの文体プロファイルを取得（未生成なら404）
 * - Claude API でリプライドラフトを3候補生成
 * - reply_drafts テーブルに保存して返す
 */
describe('POST /api/drafts/generate', () => {
  let mockAnthropicInstance: { messages: { create: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    vi.resetAllMocks()
    mockAnthropicInstance = {
      messages: {
        create: vi.fn(),
      },
    }
    MockAnthropic.mockImplementation(() => mockAnthropicInstance as any)
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
      tone: 'professional',
      vocabulary: ['AI', 'テクノロジー'],
    }

    const mockDraftCandidates = [
      '候補1のドラフトテキスト',
      '候補2のドラフトテキスト',
      '候補3のドラフトテキスト',
    ]

    // Claude API が3候補を返す（JSON 形式 or 改行区切り）
    mockAnthropicInstance.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockDraftCandidates),
        },
      ],
    } as any)

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

    // Assert: Claude API が呼ばれたこと
    expect(mockAnthropicInstance.messages.create).toHaveBeenCalledOnce()
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
    const mockProfile = { id: 'profile-1', x_account_id: 'account-1' }
    const mockDrafts = [
      { id: 'draft-1', content: '候補1', status: 'pending' },
      { id: 'draft-2', content: '候補2', status: 'pending' },
      { id: 'draft-3', content: '候補3', status: 'pending' },
    ]

    mockAnthropicInstance.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(['候補1', '候補2', '候補3']) }],
    } as any)

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
    const mockProfile = { id: 'profile-1', x_account_id: 'account-1' }

    // Claude API がエラーをスロー
    mockAnthropicInstance.messages.create.mockRejectedValue(
      new Error('Claude API internal error')
    )

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
