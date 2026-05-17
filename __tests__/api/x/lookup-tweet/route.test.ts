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

import { GET } from '@/app/api/x/lookup-tweet/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

function mockAuthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  } as any)
}

function mockUnauthenticated() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as any)
}

describe('GET /api/x/lookup-tweet', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.X_BEARER_TOKEN = 'test-bearer-token'
  })

  it('未認証の場合は401を返す', async () => {
    mockUnauthenticated()
    const request = new Request('http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/12345')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('url パラメータなしの場合は400を返す', async () => {
    mockAuthenticated()
    const request = new Request('http://localhost/api/x/lookup-tweet')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'url is required' },
      { status: 400 }
    )
  })

  it('X_BEARER_TOKEN 未設定の場合は500を返す', async () => {
    mockAuthenticated()
    delete process.env.X_BEARER_TOKEN
    const request = new Request('http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/12345')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'X_BEARER_TOKEN not configured' },
      { status: 500 }
    )
  })

  it('https://x.com/user/status/12345 から tweet_id=12345 を抽出して X API を呼ぶ', async () => {
    mockAuthenticated()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: '12345', text: 'Hello World', author_id: 'user-1' },
      }),
    })

    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/12345'
    )
    await GET(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tweets/12345'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        }),
      })
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ tweet_id: '12345', text: 'Hello World' })
    )
  })

  it('https://twitter.com/user/status/99999 形式のURL も認識する', async () => {
    mockAuthenticated()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: '99999', text: 'Twitter URL test', author_id: 'user-2' },
      }),
    })

    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://twitter.com/user/status/99999'
    )
    await GET(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tweets/99999'),
      expect.any(Object)
    )
  })

  it('URL が status/ID 形式でない場合は400を返す', async () => {
    mockAuthenticated()
    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://x.com/user'
    )
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Invalid tweet URL' },
      { status: 400 }
    )
  })

  it('X API が404を返した場合は404を返す', async () => {
    mockAuthenticated()
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ errors: [{ message: 'Not Found' }] }),
    })

    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/00000'
    )
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 404 }
    )
  })

  it('X API へのネットワーク障害時は500を返す', async () => {
    mockAuthenticated()
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/12345'
    )
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'fetch failed' }),
      { status: 500 }
    )
  })

  it('X API が ok:true でも data フィールドなしの場合は502を返す', async () => {
    mockAuthenticated()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ meta: { result_count: 0 } }), // data field missing
    })

    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=https://x.com/user/status/12345'
    )
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('サブドメイン付きURL (attacker.com/x.com/...) は Invalid tweet URL になる', async () => {
    mockAuthenticated()
    const request = new Request(
      'http://localhost/api/x/lookup-tweet?url=http://attacker.com/x.com/user/status/12345'
    )
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Invalid tweet URL' },
      { status: 400 }
    )
  })
})
