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

import { DELETE } from '@/app/api/accounts/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/accounts/[id]', () => {
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

    const request = new Request('http://localhost/api/accounts/1', {
      method: 'DELETE',
    })

    // Act
    await DELETE(request, makeParams('1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('他ユーザーのアカウントを削除しようとすると404を返す', async () => {
    // Arrange: 指定IDのアカウントが別ユーザー所有（user_id が一致しない）
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts/99', {
      method: 'DELETE',
    })

    // Act
    await DELETE(request, makeParams('99'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Not Found' },
      { status: 404 }
    )
  })

  it('存在しないIDを削除しようとすると404を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts/9999', {
      method: 'DELETE',
    })

    // Act
    await DELETE(request, makeParams('9999'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Not Found' },
      { status: 404 }
    )
  })

  it('正常系: 自分のアカウントを削除すると200を返す', async () => {
    // Arrange
    const deletedAccount = {
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
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: deletedAccount, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/accounts/1', {
      method: 'DELETE',
    })

    // Act
    await DELETE(request, makeParams('1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      deletedAccount,
      { status: 200 }
    )
  })
})
