// X (Twitter) API クライアント（スタブ）
// Phase 2 で実装予定

export interface TweetParams {
  text: string
}

export interface TweetResult {
  id: string
  text: string
}

export async function postTweet(_params: TweetParams): Promise<TweetResult> {
  throw new Error('X API client not implemented yet. Implement in Phase 2.')
}
