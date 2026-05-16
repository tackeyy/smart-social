import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postThread, uploadMedia } from '@/lib/x/client'

describe('postThread', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // 環境変数をダミー設定（buildOAuthHeader が参照する）
    process.env.X_API_KEY = 'test-api-key'
    process.env.X_API_SECRET = 'test-api-secret'
    process.env.X_ACCESS_TOKEN = 'test-access-token'
    process.env.X_ACCESS_TOKEN_SECRET = 'test-access-token-secret'
  })

  it('2件のツイートを連鎖的にリプライ投稿する', async () => {
    // Arrange: 1回目はtweets[0]、2回目はtweets[0]へのリプライとしてtweets[1]を投稿
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-001', text: 'First tweet' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-002', text: 'Second tweet' } }),
        })
    )

    // Act
    const result = await postThread({ tweets: ['First tweet', 'Second tweet'] })

    // Assert
    expect(result.tweet_ids).toEqual(['tweet-001', 'tweet-002'])
    expect(fetch).toHaveBeenCalledTimes(2)

    // 2回目の呼び出しに reply.in_reply_to_tweet_id が含まれていることを確認
    const secondCallBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body as string
    )
    expect(secondCallBody.reply).toEqual({ in_reply_to_tweet_id: 'tweet-001' })
  })

  it('3件のツイートを順番に連鎖投稿する', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-001', text: 'First' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-002', text: 'Second' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-003', text: 'Third' } }),
        })
    )

    // Act
    const result = await postThread({ tweets: ['First', 'Second', 'Third'] })

    // Assert
    expect(result.tweet_ids).toEqual(['tweet-001', 'tweet-002', 'tweet-003'])
    expect(fetch).toHaveBeenCalledTimes(3)

    // 2回目は tweet-001 へのリプライ
    const secondBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body as string
    )
    expect(secondBody.reply?.in_reply_to_tweet_id).toBe('tweet-001')

    // 3回目は tweet-002 へのリプライ
    const thirdBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[2][1].body as string
    )
    expect(thirdBody.reply?.in_reply_to_tweet_id).toBe('tweet-002')
  })

  it('1件以下のtweets配列はエラーになる', async () => {
    // Arrange: fetch は呼ばれないはず
    vi.stubGlobal('fetch', vi.fn())

    // Act & Assert: 1件
    await expect(postThread({ tweets: ['Only one tweet'] })).rejects.toThrow(
      'Thread requires at least 2 tweets'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('空のtweets配列はエラーになる', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn())

    // Act & Assert
    await expect(postThread({ tweets: [] })).rejects.toThrow(
      'Thread requires at least 2 tweets'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accountToken が指定された場合はそのトークンを使う', async () => {
    // Arrange
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-a', text: 'Tweet A' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ data: { id: 'tweet-b', text: 'Tweet B' } }),
        })
    )

    const accountToken = {
      access_token: 'custom-token',
      access_token_secret: 'custom-secret',
    }

    // Act
    const result = await postThread({
      tweets: ['Tweet A', 'Tweet B'],
      accountToken,
    })

    // Assert
    expect(result.tweet_ids).toHaveLength(2)
    // Authorization ヘッダーにカスタムトークンが使われていること（oauth_token= に含まれる）
    const firstCallHeaders = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers
    expect(firstCallHeaders['Authorization']).toContain('oauth_token=')
    // 環境変数のトークンではなくカスタムトークン由来の署名になっていること（署名キーが異なる）
    expect(firstCallHeaders['Authorization']).not.toContain(
      encodeURIComponent('test-access-token')
    )
  })
})

describe('uploadMedia', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.X_API_KEY = 'test-api-key'
    process.env.X_API_SECRET = 'test-api-secret'
    process.env.X_ACCESS_TOKEN = 'test-access-token'
    process.env.X_ACCESS_TOKEN_SECRET = 'test-access-token-secret'
  })

  it('画像をアップロードしてmedia_id_stringを返す', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ media_id_string: '12345678901234567' }),
    }))

    const mediaData = Buffer.from('fake-image-data')

    // Act
    const result = await uploadMedia({ mediaData, mimeType: 'image/jpeg' })

    // Assert
    expect(result).toEqual({ media_id_string: '12345678901234567' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('multipart/form-data形式でmedia_dataとmedia_typeを送信する', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ media_id_string: 'media-abc' }),
    }))

    const mediaData = Buffer.from('fake-png-data')

    // Act
    await uploadMedia({ mediaData, mimeType: 'image/png' })

    // Assert: FormData オブジェクトが body として渡されていること
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const [url, options] = callArgs
    expect(url).toBe('https://upload.twitter.com/1.1/media/upload.json')
    expect(options.body).toBeInstanceOf(FormData)

    const formData = options.body as FormData
    expect(formData.get('media_type')).toBe('image/png')
    expect(formData.get('media_data')).toBe(mediaData.toString('base64'))
  })

  it('アップロード先URLは upload.twitter.com/1.1/media/upload.json', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ media_id_string: 'media-xyz' }),
    }))

    // Act
    await uploadMedia({ mediaData: Buffer.from('data'), mimeType: 'image/gif' })

    // Assert
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(calledUrl).toBe('https://upload.twitter.com/1.1/media/upload.json')
  })

  it('429レスポンスはRateLimitErrorになる', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errors: [{ message: 'Rate limit exceeded' }] }),
    }))

    // Act & Assert
    await expect(
      uploadMedia({ mediaData: Buffer.from('data'), mimeType: 'image/jpeg' })
    ).rejects.toThrow('RateLimitError')
  })

  it('401レスポンスはAuthErrorになる', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    }))

    // Act & Assert
    await expect(
      uploadMedia({ mediaData: Buffer.from('data'), mimeType: 'image/jpeg' })
    ).rejects.toThrow('AuthError')
  })
})
