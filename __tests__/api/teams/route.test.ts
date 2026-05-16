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

import { GET, POST } from '@/app/api/teams/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/teams', () => {
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

    const request = new Request('http://localhost/api/teams')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('認証済みの場合は自分の所属チーム一覧を返す', async () => {
    // Arrange: team_members JOIN teams(*) の結果形式
    const teamA = { id: 'team-1', name: 'チームA', owner_id: 'user-1', created_at: '2026-01-01T00:00:00Z' }
    const teamB = { id: 'team-2', name: 'チームB', owner_id: 'user-1', created_at: '2026-01-02T00:00:00Z' }
    const mockRows = [{ teams: teamA }, { teams: teamB }]

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/teams')

    // Act
    await GET(request)

    // Assert: rows から teams を展開した配列が返る
    expect(mockNextResponseJson).toHaveBeenCalledWith([teamA, teamB])
  })
})

describe('POST /api/teams', () => {
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

    const request = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'テストチーム' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('name が空の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('正常なリクエストで201とチームを返す', async () => {
    // Arrange
    const newTeam = {
      id: 'team-1',
      name: 'テストチーム',
      owner_id: 'user-1',
      created_at: '2026-05-17T00:00:00Z',
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
        single: vi.fn().mockResolvedValue({ data: newTeam, error: null }),
      }),
    } as any)

    const request = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'テストチーム' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(newTeam, { status: 201 })
  })

  it('name が100文字超の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'あ'.repeat(101) }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('team_members INSERTが失敗した場合は500を返しteamsをロールバックする', async () => {
    // Arrange
    const newTeam = {
      id: 'team-rollback',
      name: 'ロールバックチーム',
      created_by: 'user-1',
      created_at: '2026-05-17T00:00:00Z',
    }

    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'teams' && fromCallCount === 1) {
          // teams INSERT
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newTeam, error: null }),
          }
        }
        if (table === 'team_members') {
          // team_members INSERT → 失敗
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23503', message: 'foreign key violation' },
            }),
          }
        }
        // teams DELETE（ロールバック）
        return {
          delete: deleteMock,
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ロールバックチーム' }),
    })

    // Act
    await POST(request)

    // Assert: 500が返る
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
    // ロールバック: teams.delete() が呼ばれている
    expect(deleteMock).toHaveBeenCalled()
  })
})
