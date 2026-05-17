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

import { PATCH } from '@/app/api/profile/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

/**
 * PATCH /api/profile のテスト
 *
 * 対象ファイル: app/api/profile/route.ts
 *
 * 仕様:
 * - リクエストボディに x_account_id と更新フィールドを受け取る
 * - 認証済みユーザーの x_account_id 所有権を確認
 * - style_profiles テーブルの profile_data を部分更新
 * - バリデーション: tone は必須、avg_length は 0 以上の整数
 */
describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // -------------------------------------------------------------------
  // 認証・認可
  // -------------------------------------------------------------------

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '丁寧でフレンドリー' }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('x_account_id が他ユーザーのものなら403を返す', async () => {
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
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-other-user', tone: '丁寧でフレンドリー' }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 403 }
    )
  })

  // -------------------------------------------------------------------
  // バリデーション
  // -------------------------------------------------------------------

  it('x_account_id が未指定の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: '丁寧でフレンドリー' }), // x_account_id なし
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('tone が空文字の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '' }), // tone が空文字
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('avg_length が負数の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '丁寧でフレンドリー', avg_length: -1 }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('patterns に非文字列配列（数値を含む配列）を送った場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '丁寧でフレンドリー', patterns: [1, 2, 3] }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('patterns が配列でない場合（文字列）は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '丁寧でフレンドリー', patterns: 'not-an-array' }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('tone が500文字超の場合は400を返す', async () => {
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

    const longTone = 'あ'.repeat(501)

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: longTone }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('avg_length が小数（3.5）の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_account_id: 'account-1', tone: '丁寧でフレンドリー', avg_length: 3.5 }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  // -------------------------------------------------------------------
  // 正常系
  // -------------------------------------------------------------------

  it('正常なリクエストで200とプロファイルを返す', async () => {
    // Arrange
    const mockAccount = {
      id: 'account-1',
      user_id: 'user-1',
    }

    const updatedProfile = {
      x_account_id: 'account-1',
      profile_data: {
        tone: '丁寧でフレンドリー',
        avg_length: 100,
      },
    }

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
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        tone: '丁寧でフレンドリー',
        avg_length: 100,
      }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ profile: expect.any(Object) }),
      expect.objectContaining({ status: 200 })
    )
  })

  it('プロファイルが存在しない場合（no rows）は404を返す', async () => {
    // Arrange: x_account_id は所有者のものだが style_profiles にレコードがない
    const mockAccount = {
      id: 'account-1',
      user_id: 'user-1',
    }

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
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            // no rows → PGRST116
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }
        }
        return { from: vi.fn() }
      }),
    } as any)

    const request = new Request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_account_id: 'account-1',
        tone: '丁寧でフレンドリー',
      }),
    })

    // Act
    await PATCH(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 404 }
    )
  })
})
