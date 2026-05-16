export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'posted'

export interface Draft {
  id: string
  content: string
  status: DraftStatus
  scheduled_at: string | null
  posted_at: string | null
  created_at: string
  updated_at: string
}

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
