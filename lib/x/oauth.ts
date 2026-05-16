import { createHmac, randomBytes } from 'crypto'

// ---- OAuth 1.0a ユーティリティ ----

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

function buildOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join('&')

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`

  return createHmac('sha1', signingKey).update(signatureBase).digest('base64')
}

function buildOAuthHeader(
  method: string,
  url: string,
  extraParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...extraParams,
  }

  const signature = buildOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret)
  oauthParams.oauth_signature = signature

  const headerParts = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// ---- 3-legged OAuth フロー ----

export interface RequestTokenResult {
  oauth_token: string
  oauth_token_secret: string
}

export interface AccessTokenResult {
  access_token: string
  access_token_secret: string
  user_id: string
  screen_name: string
}

/**
 * Step 1: Request Token を取得する
 */
export async function getRequestToken(callbackUrl: string): Promise<RequestTokenResult> {
  const url = 'https://api.twitter.com/oauth/request_token'
  const method = 'POST'
  const consumerSecret = process.env.X_API_SECRET!

  const authHeader = buildOAuthHeader(
    method,
    url,
    { oauth_callback: callbackUrl },
    consumerSecret,
    '' // request token 取得時はトークンシークレットなし
  )

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get request token: HTTP ${response.status}`)
  }

  const text = await response.text()
  const params = new URLSearchParams(text)
  const oauth_token = params.get('oauth_token')
  const oauth_token_secret = params.get('oauth_token_secret')

  if (!oauth_token || !oauth_token_secret) {
    throw new Error('Invalid request token response')
  }

  return { oauth_token, oauth_token_secret }
}

/**
 * Step 3: Access Token を取得する
 */
export async function getAccessToken(
  oauthToken: string,
  oauthVerifier: string,
  requestTokenSecret: string
): Promise<AccessTokenResult> {
  const url = 'https://api.twitter.com/oauth/access_token'
  const method = 'POST'
  const consumerSecret = process.env.X_API_SECRET!

  const authHeader = buildOAuthHeader(
    method,
    url,
    {
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
    },
    consumerSecret,
    requestTokenSecret
  )

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: HTTP ${response.status}`)
  }

  const text = await response.text()
  const params = new URLSearchParams(text)
  const oauth_token = params.get('oauth_token')
  const oauth_token_secret = params.get('oauth_token_secret')
  const user_id = params.get('user_id')
  const screen_name = params.get('screen_name')

  if (!oauth_token || !oauth_token_secret || !user_id || !screen_name) {
    throw new Error('Invalid access token response')
  }

  return {
    access_token: oauth_token,
    access_token_secret: oauth_token_secret,
    user_id,
    screen_name,
  }
}

/**
 * Step 2: X 認証ページへのURLを生成する
 */
export function buildAuthorizationUrl(oauthToken: string): string {
  return `https://twitter.com/i/oauth/authorize?oauth_token=${encodeURIComponent(oauthToken)}`
}
