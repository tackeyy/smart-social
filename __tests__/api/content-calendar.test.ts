import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filterEventsByMonth, getCurrentMonthEvents } from '@/lib/content-calendar'
import type { ContentCalendarEvent } from '@/types/content-calendar'

const mockEvents: ContentCalendarEvent[] = [
  {
    id: '1',
    title: '確定申告シーズン開始',
    description: null,
    target_month: 1,
    event_date: null,
    suggested_topics: ['医療費控除の計算', '副業の確定申告'],
    industry: 'tax',
    priority: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: '年末調整ピーク',
    description: null,
    target_month: 11,
    event_date: null,
    suggested_topics: ['年末調整の書き方', '配偶者控除'],
    industry: 'tax',
    priority: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: '年末調整締切',
    description: null,
    target_month: 12,
    event_date: null,
    suggested_topics: ['ふるさと納税の締切', '節税対策'],
    industry: 'tax',
    priority: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('filterEventsByMonth', () => {
  it('指定した月のイベントのみを返す', () => {
    const result = filterEventsByMonth(mockEvents, 1)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('確定申告シーズン開始')
  })

  it('データが存在しない月は空配列を返す', () => {
    const result = filterEventsByMonth(mockEvents, 7)
    expect(result).toHaveLength(0)
  })

  it('複数件あれば複数件返す', () => {
    const events = [
      ...mockEvents,
      { ...mockEvents[0], id: '4', title: '確定申告追加情報', target_month: 1 },
    ]
    const result = filterEventsByMonth(events, 1)
    expect(result).toHaveLength(2)
  })

  it('priorityの昇順でソートされて返す', () => {
    const events: ContentCalendarEvent[] = [
      { ...mockEvents[0], priority: 2 },
      { ...mockEvents[1], target_month: 1, priority: 1 },
    ]
    const result = filterEventsByMonth(events, 1)
    expect(result[0].priority).toBe(1)
    expect(result[1].priority).toBe(2)
  })
})

describe('getCurrentMonthEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('現在月のイベントを返す', () => {
    vi.setSystemTime(new Date('2026-01-15'))
    const result = getCurrentMonthEvents(mockEvents)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('確定申告シーズン開始')
  })

  it('12月の場合は12月のイベントを返す', () => {
    vi.setSystemTime(new Date('2026-12-01'))
    const result = getCurrentMonthEvents(mockEvents)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('年末調整締切')
  })
})
