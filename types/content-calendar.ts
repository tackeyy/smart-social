export interface ContentCalendarEvent {
  id: string
  title: string
  description: string | null
  target_month: number | null
  event_date: string | null
  suggested_topics: string[]
  industry: string
  priority: number
  created_at: string
}
