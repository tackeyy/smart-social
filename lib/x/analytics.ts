import { createHmac, randomBytes } from 'crypto'

const X_API_BASE = 'https://api.x.com/2'

// ---- 型定義 ----

export interface TweetMetrics {
  tweet_id: string
  text: string
  created_at: string
  like_count: number
  retweet_count: number
  reply_count: number
  impression_count: number
  engagement_rate: number // (like+rt+reply) / impression * 100
}

// ---- OAuth 1.0a ヘルパー（アカウント別トークンを引数で受け取る） ----

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

function buildOAuthHeaderWithTokens(
  method: string,
  url: string,
  accessToken: string,
  accessTokenSecret: string,
): string {
  const apiKey = process.env.X_API_KEY!
  const apiSecret = process.env.X_API_SECRET!

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

interface FetchTweetMetricsParams {
  x_user_id: string
  access_token: string
  access_token_secret: string
  max_results?: number // デフォルト20, 最大100
}

interface XApiTweet {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
    impression_count: number
  }
}

interface XApiResponse {
  data?: XApiTweet[]
  errors?: Array<{ message: string }>
}

export async function fetchTweetMetrics(
  params: FetchTweetMetricsParams,
): Promise<TweetMetrics[]> {
  const maxResults = Math.min(100, Math.max(1, params.max_results ?? 20))
  const endpoint = `${X_API_BASE}/users/${params.x_user_id}/tweets`
  const url = `${endpoint}?tweet.fields=public_metrics,created_at&max_results=${maxResults}`

  const authHeader = buildOAuthHeaderWithTokens(
    'GET',
    endpoint,
    params.access_token,
    params.access_token_secret,
  )

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
    },
  })

  const data = (await response.json()) as XApiResponse

  if (!response.ok) {
    const message = data.errors?.[0]?.message ?? `X API error: ${response.status}`
    throw new Error(message)
  }

  if (!data.data) {
    return []
  }

  return data.data.map((tweet) => {
    const { like_count, retweet_count, reply_count, impression_count } = tweet.public_metrics
    const engagement_rate =
      impression_count > 0
        ? ((like_count + retweet_count + reply_count) / impression_count) * 100
        : 0

    return {
      tweet_id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      like_count,
      retweet_count,
      reply_count,
      impression_count,
      engagement_rate,
    }
  })
}
