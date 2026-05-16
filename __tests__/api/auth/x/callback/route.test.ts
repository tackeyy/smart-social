import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
    {
      json: vi.fn((body: unknown, init?: ResponseInit) => ({
        body,
        status: init?.status ?? 200,
        json: async () => body,
      })),
      redirect: vi.fn((url: string | URL) => ({
        url: url.toString(),
        status: 307,
        cookies: {
          delete: vi.fn(),
        },
      })),
    }
  ),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/x/oauth', () => ({
  getAccessToken: vi.fn(),
}))

import { GET } from '@/app/api/auth/x/callback/route'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getAccessToken } from '@/lib/x/oauth'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockNextResponseRedirect = vi.mocked(NextResponse.redirect)
const mockCookies = vi.mocked(cookies)
const mockGetAccessToken = vi.mocked(getAccessToken)

describe('GET /api/auth/x/callback', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('oauth_token が欠損している場合は400を返す', async () => {
    const request = new Request('http://localhost/api/auth/x/callback?oauth_verifier=verifier123')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('oauth_verifier が欠損している場合は400を返す', async () => {
    const request = new Request('http://localhost/api/auth/x/callback?oauth_token=token123')
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('Cookie x_oauth_request_secret がない場合は400を返す', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any)

    const request = new Request(
      'http://localhost/api/auth/x/callback?oauth_token=token123&oauth_verifier=verifier123'
    )
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('getAccessToken が失敗（throw）した場合は500を返す', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'request_secret' }),
    } as any)
    mockGetAccessToken.mockRejectedValue(new Error('Access token fetch failed'))

    const request = new Request(
      'http://localhost/api/auth/x/callback?oauth_token=token123&oauth_verifier=verifier123'
    )
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('Supabase auth.getUser が null（未ログイン）の場合は401を返す', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'request_secret' }),
    } as any)
    mockGetAccessToken.mockResolvedValue({
      access_token: 'access_token',
      access_token_secret: 'access_secret',
      user_id: 'x_user_123',
      screen_name: 'testuser',
    })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request(
      'http://localhost/api/auth/x/callback?oauth_token=token123&oauth_verifier=verifier123'
    )
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 401 }
    )
  })

  it('upsert が失敗した場合は500を返す', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'request_secret' }),
    } as any)
    mockGetAccessToken.mockResolvedValue({
      access_token: 'access_token',
      access_token_secret: 'access_secret',
      user_id: 'x_user_123',
      screen_name: 'testuser',
    })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }),
    } as any)

    const request = new Request(
      'http://localhost/api/auth/x/callback?oauth_token=token123&oauth_verifier=verifier123'
    )
    await GET(request)
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('正常系: 全部OK の場合 NextResponse.redirect が /dashboard で呼ばれる', async () => {
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'request_secret' }),
    } as any)
    mockGetAccessToken.mockResolvedValue({
      access_token: 'access_token',
      access_token_secret: 'access_secret',
      user_id: 'x_user_123',
      screen_name: 'testuser',
    })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any)

    const request = new Request(
      'http://localhost/api/auth/x/callback?oauth_token=token123&oauth_verifier=verifier123'
    )
    await GET(request)
    expect(mockNextResponseRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/dashboard') })
    )
  })
})
