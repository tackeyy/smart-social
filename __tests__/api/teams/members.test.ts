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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { GET, POST } from '@/app/api/teams/[id]/members/route'
import { PATCH, DELETE } from '@/app/api/teams/[id]/members/[userId]/route'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockCreateSupabaseClient = vi.mocked(createSupabaseClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeUserParams(id: string, userId: string) {
  return { params: Promise.resolve({ id, userId }) }
}

describe('GET /api/teams/[id]/members', () => {
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

    const request = new Request('http://localhost/api/teams/team-1/members')

    // Act
    await GET(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('メンバー一覧が正常に返る', async () => {
    // Arrange
    const mockMembers = [
      { team_id: 'team-1', user_id: 'user-1', role: 'owner' },
      { team_id: 'team-1', user_id: 'user-2', role: 'member' },
    ]

    // fromが2回呼ばれる: 1回目=メンバーシップ確認(single)、2回目=一覧取得
    const singleMock = vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null })
    const eqForListMock = vi.fn().mockResolvedValue({ data: mockMembers, error: null })
    const eqMembershipMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: singleMock }) })

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // メンバーシップ確認
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
                }),
              }),
            }),
          }
        }
        // メンバー一覧取得
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockMembers, error: null }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members')

    // Act
    await GET(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(mockMembers)
  })
})

describe('POST /api/teams/[id]/members', () => {
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

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@example.com' }),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('email が未指定の場合は400を返す', async () => {
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

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('非メンバー（チームに所属しないユーザー）が操作しようとすると403を返す', async () => {
    // Arrange: team_members に user-1 のレコードが存在しない
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newmember@example.com' }),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 403 }
    )
  })

  it('memberロールのユーザーが招待しようとすると403を返す', async () => {
    // Arrange: user-1 は member ロール（owner/admin 以外は招待不可）
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        }),
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newmember@example.com' }),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert: memberロールは招待不可なので403
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 403 }
    )
  })

  it('重複メンバーの場合409を返す', async () => {
    // Arrange: admin が既存メンバーを再招待しようとする
    // adminClient のモック（@supabase/supabase-js）
    mockCreateSupabaseClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [{ id: 'user-2', email: 'existing@example.com' }],
            },
            error: null,
          }),
        },
      },
    } as any)

    // 1回目: メンバーシップ確認（admin）、2回目: INSERT → 重複エラー
    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // メンバーシップ確認
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
                }),
              }),
            }),
          }
        }
        // INSERT → unique constraint violation
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'duplicate key value' },
              }),
            }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 409 }
    )
  })
})

describe('PATCH /api/teams/[id]/members/[userId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('対象メンバー不存在で404を返す', async () => {
    // Arrange: 呼び出し元は owner、対象 userId が存在しない（update で null が返る）
    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // 権限チェック: owner 確認
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
                }),
              }),
            }),
          }
        }
        // update: 対象メンバー不存在で PGRST116 エラー
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116', message: 'Row not found' },
                  }),
                }),
              }),
            }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members/nonexistent-user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'member' }),
    })

    // Act
    await PATCH(request, makeUserParams('team-1', 'nonexistent-user'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'メンバーが見つかりません' },
      { status: 404 }
    )
  })
})

describe('POST /api/teams/[id]/members - role権限チェック', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('adminがownerロールを指定すると403を返す', async () => {
    // Arrange: admin がオーナーロールを付与しようとする
    mockCreateSupabaseClient.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [{ id: 'user-2', email: 'target@example.com' }],
            },
            error: null,
          }),
        },
      },
    } as any)

    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        // メンバーシップ確認（admin）
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'target@example.com', role: 'owner' }),
    })

    // Act
    await POST(request, makeParams('team-1'))

    // Assert: adminはownerロールを付与できないので403
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '指定された役割を付与する権限がありません' },
      { status: 403 }
    )
  })
})

describe('DELETE /api/teams/[id]/members/[userId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('adminがownerを除名しようとすると403を返す', async () => {
    // Arrange: admin（user-1）が owner（user-2）を除名しようとする
    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // 自分自身のメンバーシップ確認: admin
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
                }),
              }),
            }),
          }
        }
        // 除名対象（user-2）のメンバーシップ確認: owner
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members/user-2', {
      method: 'DELETE',
    })

    // Act: admin（user-1）が owner（user-2）を削除しようとする
    await DELETE(request, makeUserParams('team-1', 'user-2'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '管理者はオーナーを除名できません' },
      { status: 403 }
    )
  })

  it('最後のオーナーが退会しようとすると400を返す', async () => {
    // Arrange: user-1 が唯一のオーナーとして自己退会を試みる
    let fromCallCount = 0
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // 自分自身のメンバーシップ確認: owner
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
                }),
              }),
            }),
          }
        }
        // ownersリスト取得: user-1 だけ（1件）
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: 'user-1' }],
                error: null,
              }),
            }),
          }),
        }
      }),
    } as any)

    const request = new Request('http://localhost/api/teams/team-1/members/user-1', {
      method: 'DELETE',
    })

    // Act: user-1 が自分（user-1）を削除しようとする
    await DELETE(request, makeUserParams('team-1', 'user-1'))

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('オーナーが1人') }),
      { status: 400 }
    )
  })
})
