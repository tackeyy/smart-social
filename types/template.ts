export type TemplateChannel = 'post' | 'reply' | 'dm'

export interface PostTemplate {
  id: string
  account_id: string
  name: string
  channel: TemplateChannel
  body: string
  tags: string[]
  use_count: number
  created_at: string
  updated_at: string
}

export interface TemplateInput {
  accountId: string
  name: string
  channel: TemplateChannel | string
  body: string
  tags?: string[]
}
