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

import { GET, POST } from '@/app/api/accounts/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/accounts', () => {
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

    const request = new Request('http://localhost/api/accounts')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('正常系: ログインユーザーの x_accounts 一覧を返す', async () => {
    // Arrange
    const mockAccounts = [
      {
        id: 1,
        user_id: 'user-1',
        x_user_id: '123456789',
        screen_name: 'testuser',
        display_name: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 2,
        user_id: 'user-1',
        x_user_id: '987654321',
        screen_name: 'testuser2',
        display_name: 'Test User 2',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
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
        eq: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(mockAccounts)
  })

  it('正常系: アカウントが0件の場合は空配列を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith([])
  })
})

describe('POST /api/accounts', () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'testuser',
        display_name: 'Test User',
        x_user_id: '123456789',
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

  it('x_username が欠損している場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // x_username なし
        display_name: 'Test User',
        x_user_id: '123456789',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('display_name が欠損している場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'testuser',
        // display_name なし
        x_user_id: '123456789',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('x_user_id が欠損している場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'testuser',
        display_name: 'Test User',
        // x_user_id なし
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('x_user_id が数値文字列でない場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'testuser',
        display_name: 'Test User',
        x_user_id: 'not-a-number',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('x_username に使用禁止文字（@）が含まれる場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: '@invalid_user',
        display_name: 'Test User',
        x_user_id: '123456789',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'x_username must be alphanumeric and underscores only (max 50 chars)' },
      { status: 400 }
    )
  })

  it('x_username が51文字以上の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'a'.repeat(51),
        display_name: 'Test User',
        x_user_id: '123456789',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'x_username must be alphanumeric and underscores only (max 50 chars)' },
      { status: 400 }
    )
  })

  it('正常系: x_accounts に新規登録して201とデータを返す', async () => {
    // Arrange
    const newAccount = {
      id: 1,
      user_id: 'user-1',
      x_user_id: '123456789',
      screen_name: 'testuser',
      display_name: 'Test User',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newAccount, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x_username: 'testuser',
        display_name: 'Test User',
        x_user_id: '123456789',
      }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      newAccount,
      { status: 201 }
    )
  })
})
