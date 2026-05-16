import { createHmac, randomBytes } from 'crypto'

// ---- エラー型 ----

export class RateLimitError extends Error {
  constructor(message = 'RateLimitError') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class AuthError extends Error {
  constructor(message = 'AuthError') {
    super(message)
    this.name = 'AuthError'
  }
}

// ---- 型定義 ----

export interface TweetParams {
  text: string
  replyToId?: string
  mediaIds?: string[]
}

export interface TweetResult {
  id: string
  text: string
}

export interface ThreadParams {
  tweets: string[]
  accountToken?: { access_token: string; access_token_secret: string }
}

export interface ThreadResult {
  tweet_ids: string[]
}

export interface MediaUploadResult {
  media_id_string: string
}

// ---- OAuth 1.0a ----

const TWEET_URL = 'https://api.x.com/2/tweets'
const MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json'

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

function generateNonce(): string {
  return randomBytes(16).toString('hex')
}

function buildOAuthHeader(
  method: string,
  url: string,
  accountToken?: { access_token: string; access_token_secret: string }
): string {
  const apiKey = process.env.X_API_KEY!
  const apiSecret = process.env.X_API_SECRET!
  const accessToken = accountToken?.access_token ?? process.env.X_ACCESS_TOKEN!
  const accessTokenSecret = accountToken?.access_token_secret ?? process.env.X_ACCESS_TOKEN_SECRET!

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const sortedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&')

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`

  const signature = createHmac('sha1', signingKey).update(signatureBase).digest('base64')

  oauthParams.oauth_signature = signature

  const headerParts = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// ---- メイン関数 ----

export async function postTweet(
  params: TweetParams,
  accountToken?: { access_token: string; access_token_secret: string }
): Promise<TweetResult> {
  const method = 'POST'
  const authHeader = buildOAuthHeader(method, TWEET_URL, accountToken)

  const body: Record<string, unknown> = { text: params.text }
  if (params.replyToId) {
    body.reply = { in_reply_to_tweet_id: params.replyToId }
  }
  if (params.mediaIds && params.mediaIds.length > 0) {
    body.media = { media_ids: params.mediaIds }
  }

  const response = await fetch(TWEET_URL, {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as {
    data?: { id: string; text: string }
    errors?: Array<{ message: string }>
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new RateLimitError()
    }
    if (response.status === 401) {
      throw new AuthError()
    }
    throw new Error(data.errors?.[0]?.message ?? `HTTP ${response.status}`)
  }

  if (!data.data) {
    throw new Error('Unexpected API response: missing data field')
  }
  return data.data
}

export async function postThread(params: ThreadParams): Promise<ThreadResult> {
  if (params.tweets.length < 2) {
    throw new Error('Thread requires at least 2 tweets')
  }

  const tweet_ids: string[] = []
  let previousId: string | undefined

  for (const text of params.tweets) {
    const result = await postTweet(
      { text, replyToId: previousId },
      params.accountToken
    )
    tweet_ids.push(result.id)
    previousId = result.id
  }

  return { tweet_ids }
}

export async function uploadMedia(params: {
  mediaData: Buffer
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4'
  accountToken?: { access_token: string; access_token_secret: string }
}): Promise<MediaUploadResult> {
  const method = 'POST'
  const authHeader = buildOAuthHeader(method, MEDIA_UPLOAD_URL, params.accountToken)

  const formData = new FormData()
  formData.append('media_data', params.mediaData.toString('base64'))
  formData.append('media_type', params.mimeType)

  const response = await fetch(MEDIA_UPLOAD_URL, {
    method,
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  })

  const data = (await response.json()) as {
    media_id_string?: string
    errors?: Array<{ message: string }>
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new RateLimitError()
    }
    if (response.status === 401) {
      throw new AuthError()
    }
    throw new Error(data.errors?.[0]?.message ?? `HTTP ${response.status}`)
  }

  if (!data.media_id_string) {
    throw new Error('Unexpected API response: missing media_id_string')
  }

  return { media_id_string: data.media_id_string }
}
