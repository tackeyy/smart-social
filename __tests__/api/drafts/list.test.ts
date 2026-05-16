import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server のNextResponseをモック
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

import { GET } from '@/app/api/drafts/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

/**
 * 現在の実装 (app/api/drafts/route.ts) は認証チェックとstatusフィルタを持たない。
 * これらのテストは TDD の Red フェーズとして、実装が完了するまで失敗し続ける。
 *
 * 期待する実装フロー:
 * 1. auth.getUser() でユーザー認証チェック → 未認証は401
 * 2. クエリパラメータ ?status= があれば .eq('status', value) でフィルタ
 * 3. ドラフト一覧を返す
 */
describe('GET /api/drafts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange: auth.getUser がuserなしを返す
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any)

    // Act
    await GET()

    // Assert: 認証チェックがない現実装では401が返らないのでFailする（Red）
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('認証済みの場合はドラフト一覧を返す', async () => {
    // Arrange
    const mockDrafts = [
      { id: 'draft-1', content: 'Hello', status: 'pending', created_at: '2024-01-01' },
      { id: 'draft-2', content: 'World', status: 'posted', created_at: '2024-01-02' },
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
        order: vi.fn().mockResolvedValue({ data: mockDrafts, error: null }),
      }),
    } as any)

    // Act
    await GET()

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(mockDrafts)
  })

  it('?status=pendingで絞り込まれたドラフトを返す', async () => {
    // Arrange
    const pendingDrafts = [
      { id: 'draft-1', content: 'Hello', status: 'pending', created_at: '2024-01-01' },
    ]
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: pendingDrafts, error: null }),
    }
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any)

    const request = new Request('http://localhost/api/drafts?status=pending')

    // Act
    await GET(request)

    // Assert: statusフィルタがない現実装では eq が呼ばれないのでFailする（Red）
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('status', 'pending')
    expect(mockNextResponseJson).toHaveBeenCalledWith(pendingDrafts)
  })
})
