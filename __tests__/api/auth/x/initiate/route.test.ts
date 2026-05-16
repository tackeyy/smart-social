import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => {
  const mockCookiesSet = vi.fn()
  const mockRedirectResponse = {
    url: '',
    status: 307,
    cookies: {
      set: mockCookiesSet,
    },
  }
  return {
    NextResponse: Object.assign(
      vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
      {
        json: vi.fn((body: unknown, init?: ResponseInit) => ({
          body,
          status: init?.status ?? 200,
          json: async () => body,
        })),
        redirect: vi.fn((_url: string | URL) => mockRedirectResponse),
      }
    ),
    __mockCookiesSet: mockCookiesSet,
  }
})

vi.mock('@/lib/x/oauth', () => ({
  getRequestToken: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
}))

import { GET } from '@/app/api/auth/x/initiate/route'
import { getRequestToken, buildAuthorizationUrl } from '@/lib/x/oauth'
import { NextResponse } from 'next/server'

const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockNextResponseRedirect = vi.mocked(NextResponse.redirect)
const mockGetRequestToken = vi.mocked(getRequestToken)
const mockBuildAuthorizationUrl = vi.mocked(buildAuthorizationUrl)

describe('GET /api/auth/x/initiate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // redirect の返すオブジェクトを毎回リセット（cookies.set のモック含む）
    const mockCookiesSet = vi.fn()
    mockNextResponseRedirect.mockReturnValue({
      url: '',
      status: 307,
      cookies: {
        set: mockCookiesSet,
      },
    } as any)
  })

  it('getRequestToken が失敗（throw）した場合は500エラーJSONを返す', async () => {
    mockGetRequestToken.mockRejectedValue(new Error('Request token failed'))

    const request = new Request('http://localhost/api/auth/x/initiate')
    await GET(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('正常系: getRequestToken が成功した場合 NextResponse.redirect が authorization URL で呼ばれる', async () => {
    mockGetRequestToken.mockResolvedValue({
      oauth_token: 'oauth_token_123',
      oauth_token_secret: 'oauth_secret_123',
    })
    mockBuildAuthorizationUrl.mockReturnValue('https://api.twitter.com/oauth/authorize?oauth_token=oauth_token_123')

    const request = new Request('http://localhost/api/auth/x/initiate')
    await GET(request)

    expect(mockNextResponseRedirect).toHaveBeenCalledWith(
      'https://api.twitter.com/oauth/authorize?oauth_token=oauth_token_123'
    )
  })

  it('正常系: response.cookies.set が x_oauth_request_secret で呼ばれる', async () => {
    const mockCookiesSet = vi.fn()
    mockNextResponseRedirect.mockReturnValue({
      url: '',
      status: 307,
      cookies: {
        set: mockCookiesSet,
      },
    } as any)

    mockGetRequestToken.mockResolvedValue({
      oauth_token: 'oauth_token_123',
      oauth_token_secret: 'oauth_secret_123',
    })
    mockBuildAuthorizationUrl.mockReturnValue('https://api.twitter.com/oauth/authorize?oauth_token=oauth_token_123')

    const request = new Request('http://localhost/api/auth/x/initiate')
    await GET(request)

    expect(mockCookiesSet).toHaveBeenCalledWith(
      'x_oauth_request_secret',
      'oauth_secret_123',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/',
      })
    )
  })
})
