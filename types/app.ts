export type DraftStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'processing'
  | 'posted'
  | 'rejected'
  | 'failed'

export type DraftType = 'original' | 'reply' | 'thread'

export interface AiCandidate {
  text: string
  generated_by: string
  created_at: string
}

export interface Draft {
  id: string
  user_id: string
  x_account_id: number
  content: string
  type: DraftType
  status: DraftStatus
  // スケジュール投稿
  scheduled_at: string | null
  posted_at: string | null
  retry_count: number
  last_error: string | null
  posted_tweet_id: string | null
  // reply 種別のみ
  source_tweet_id: string | null
  source_tweet_text: string | null
  ai_candidates: AiCandidate[] | null
  selected_index: number | null
  // メタ
  created_at: string
  updated_at: string
}

/** @deprecated scheduled_posts テーブルは drafts に統合されました。Draft.status === 'scheduled' を参照してください。 */
export interface ScheduledPost {
  id: string
  draft_id: string
  scheduled_at: string
  posted_at: string | null
  status: 'pending' | 'posted' | 'failed'
  created_at: string
}

export interface XAccount {
  id: number
  user_id: string
  x_user_id: string
  screen_name: string
  created_at: string
  updated_at: string
}
