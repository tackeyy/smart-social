import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

import { GET } from '@/app/api/x/lookup-user/route'
import { NextResponse } from 'next/server'

const mockNextResponseJson = vi.mocked(NextResponse.json)

function makeRequest(url: string): Request {
  return new Request(url)
}

function mockFetchResponse(status: number, body: unknown): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('GET /api/x/lookup-user', () => {
  beforeEach(() => {
    process.env.X_BEARER_TOKEN = 'test_bearer_token'
    vi.resetAllMocks()
    // NextResponse.json を再モック（resetAllMocks でリセットされるため）
    vi.mocked(NextResponse.json).mockImplementation((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    }) as any)
  })

  afterEach(() => {
    delete process.env.X_BEARER_TOKEN
  })

  it('username クエリパラメータなしの場合は400を返す', async () => {
    const request = makeRequest('http://localhost/api/x/lookup-user')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'username is required' },
      { status: 400 }
    )
  })

  it('X_BEARER_TOKEN 環境変数なしの場合は500を返す', async () => {
    delete process.env.X_BEARER_TOKEN

    const request = makeRequest('http://localhost/api/x/lookup-user?username=testuser')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'X_BEARER_TOKEN not configured' },
      { status: 500 }
    )
  })

  it('@username の形式で渡したとき @ が除去されて API に渡される', async () => {
    mockFetchResponse(200, {
      data: { id: '123', name: 'Test User', username: 'testuser' },
    })

    const request = makeRequest('http://localhost/api/x/lookup-user?username=@testuser')
    await GET(request)

    // fetch の URL に @ が含まれないこと
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const fetchUrl = fetchCall[0] as string
    expect(fetchUrl).toContain('testuser')
    expect(fetchUrl).not.toContain('%40') // @のURLエンコード
    expect(fetchUrl).not.toContain('@')
  })

  it('X API が 404 の場合は404を返す', async () => {
    mockFetchResponse(404, { errors: [{ message: 'User not found' }] })

    const request = makeRequest('http://localhost/api/x/lookup-user?username=nonexistent')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    )
  })

  it('X API が 500 の場合は500を返す', async () => {
    mockFetchResponse(500, { errors: [{ message: 'Internal Server Error' }] })

    const request = makeRequest('http://localhost/api/x/lookup-user?username=testuser')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'X API error: 500' },
      { status: 500 }
    )
  })

  it('正常系: X API が成功した場合はユーザー情報を返す', async () => {
    mockFetchResponse(200, {
      data: { id: '123', name: 'Test User', username: 'testuser' },
    })

    const request = makeRequest('http://localhost/api/x/lookup-user?username=testuser')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith({
      x_user_id: '123',
      display_name: 'Test User',
      x_username: 'testuser',
    })
  })
})
