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
}

export interface TweetResult {
  id: string
  text: string
}

// ---- OAuth 1.0a ----

const TWEET_URL = 'https://api.x.com/2/tweets'

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

function buildOAuthHeader(method: string, url: string): string {
  const apiKey = process.env.X_API_KEY!
  const apiSecret = process.env.X_API_SECRET!
  const accessToken = process.env.X_ACCESS_TOKEN!
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET!

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

export async function postTweet(params: TweetParams): Promise<TweetResult> {
  const method = 'POST'
  const authHeader = buildOAuthHeader(method, TWEET_URL)

  const body: Record<string, unknown> = { text: params.text }
  if (params.replyToId) {
    body.reply = { in_reply_to_tweet_id: params.replyToId }
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
