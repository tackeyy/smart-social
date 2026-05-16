import type { ContentCalendarEvent } from '@/types/content-calendar'

export function filterEventsByMonth(
  events: ContentCalendarEvent[],
  month: number
): ContentCalendarEvent[] {
  return events
    .filter((e) => e.target_month === month)
    .sort((a, b) => a.priority - b.priority)
}

export function getCurrentMonthEvents(events: ContentCalendarEvent[]): ContentCalendarEvent[] {
  const month = new Date().getMonth() + 1
  return filterEventsByMonth(events, month)
}
