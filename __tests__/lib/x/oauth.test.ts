import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('buildAuthorizationUrl', () => {
  it('oauth_token を含む X 認証ページURLを返す', async () => {
    const { buildAuthorizationUrl } = await import('@/lib/x/oauth')
    const url = buildAuthorizationUrl('my_token_123')
    expect(url).toBe('https://twitter.com/i/oauth/authorize?oauth_token=my_token_123')
  })

  it('oauth_token が URL エンコードされる', async () => {
    const { buildAuthorizationUrl } = await import('@/lib/x/oauth')
    const url = buildAuthorizationUrl('token with spaces')
    expect(url).toContain('oauth_token=token%20with%20spaces')
  })
})

describe('getRequestToken', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env.X_API_KEY = 'test_api_key'
    process.env.X_API_SECRET = 'test_api_secret'
  })

  it('成功時に oauth_token と oauth_token_secret を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=token123&oauth_token_secret=secret456&oauth_callback_confirmed=true',
    }))

    const { getRequestToken } = await import('@/lib/x/oauth')
    const result = await getRequestToken('https://example.com/callback')

    expect(result).toEqual({
      oauth_token: 'token123',
      oauth_token_secret: 'secret456',
    })
  })

  it('POST https://api.twitter.com/oauth/request_token にリクエストを送る', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=token123&oauth_token_secret=secret456',
    })
    vi.stubGlobal('fetch', mockFetch)

    const { getRequestToken } = await import('@/lib/x/oauth')
    await getRequestToken('https://example.com/callback')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.twitter.com/oauth/request_token')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toMatch(/^OAuth /)
  })

  it('API が失敗した場合はエラーをスローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    const { getRequestToken } = await import('@/lib/x/oauth')
    await expect(getRequestToken('https://example.com/callback')).rejects.toThrow(
      'Failed to get request token: HTTP 401'
    )
  })

  it('レスポンスに oauth_token が含まれない場合はエラーをスローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'some_other_param=value',
    }))

    const { getRequestToken } = await import('@/lib/x/oauth')
    await expect(getRequestToken('https://example.com/callback')).rejects.toThrow(
      'Invalid request token response'
    )
  })
})

describe('getAccessToken', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env.X_API_KEY = 'test_api_key'
    process.env.X_API_SECRET = 'test_api_secret'
  })

  it('成功時に access_token, access_token_secret, user_id, screen_name を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'oauth_token=access123&oauth_token_secret=accessSecret456&user_id=9876543210&screen_name=testuser',
    }))

    const { getAccessToken } = await import('@/lib/x/oauth')
    const result = await getAccessToken('request_token', 'verifier_code', 'request_secret')

    expect(result).toEqual({
      access_token: 'access123',
      access_token_secret: 'accessSecret456',
      user_id: '9876543210',
      screen_name: 'testuser',
    })
  })

  it('POST https://api.twitter.com/oauth/access_token にリクエストを送る', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'oauth_token=access123&oauth_token_secret=accessSecret456&user_id=9876543210&screen_name=testuser',
    })
    vi.stubGlobal('fetch', mockFetch)

    const { getAccessToken } = await import('@/lib/x/oauth')
    await getAccessToken('request_token', 'verifier_code', 'request_secret')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.twitter.com/oauth/access_token')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toMatch(/^OAuth /)
  })

  it('API が失敗した場合はエラーをスローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }))

    const { getAccessToken } = await import('@/lib/x/oauth')
    await expect(
      getAccessToken('request_token', 'verifier_code', 'request_secret')
    ).rejects.toThrow('Failed to get access token: HTTP 401')
  })

  it('レスポンスに screen_name が含まれない場合はエラーをスローする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=access123&oauth_token_secret=accessSecret456&user_id=9876543210',
    }))

    const { getAccessToken } = await import('@/lib/x/oauth')
    await expect(
      getAccessToken('request_token', 'verifier_code', 'request_secret')
    ).rejects.toThrow('Invalid access token response')
  })
})
