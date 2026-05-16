import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ContentCalendarSection } from '@/components/dashboard/ContentCalendarSection'
import type { ContentCalendarEvent } from '@/types/content-calendar'

const mockEvents: ContentCalendarEvent[] = [
  {
    id: '1',
    title: '確定申告シーズン開始',
    description: null,
    target_month: 1,
    event_date: null,
    suggested_topics: ['医療費控除の計算方法', '副業の確定申告'],
    industry: 'tax',
    priority: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('ContentCalendarSection', () => {
  it('イベントが存在する場合は「今月のホットトピック」セクションが表示される', () => {
    render(React.createElement(ContentCalendarSection, { events: mockEvents }))
    expect(screen.getByText('今月のホットトピック')).toBeTruthy()
  })

  it('イベントのタイトルが表示される', () => {
    render(React.createElement(ContentCalendarSection, { events: mockEvents }))
    expect(screen.getByText('確定申告シーズン開始')).toBeTruthy()
  })

  it('suggested_topicsがカードとして表示される', () => {
    render(React.createElement(ContentCalendarSection, { events: mockEvents }))
    expect(screen.getByText('医療費控除の計算方法')).toBeTruthy()
    expect(screen.getByText('副業の確定申告')).toBeTruthy()
  })

  it('「このネタでドラフト作成」リンクがある', () => {
    render(React.createElement(ContentCalendarSection, { events: mockEvents }))
    const links = screen.getAllByText('このネタでドラフト作成')
    expect(links.length).toBeGreaterThan(0)
  })

  it('イベントが空の場合はセクションが表示されない', () => {
    render(React.createElement(ContentCalendarSection, { events: [] }))
    expect(screen.queryByText('今月のホットトピック')).toBeNull()
  })
})
