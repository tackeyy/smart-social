import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { MonitoringSection } from '@/components/MonitoringSection'

const now = new Date()

function makePostedDraft(minutesAgo: number) {
  const postedAt = new Date(now.getTime() - minutesAgo * 60 * 1000)
  return {
    id: `draft-${minutesAgo}`,
    content: `${minutesAgo}分前のツイート`,
    posted_at: postedAt.toISOString(),
    posted_tweet_id: `tweet-${minutesAgo}`,
    status: 'posted' as const,
  }
}

describe('MonitoringSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  it('2時間以内の投稿が表示される', () => {
    const draft = makePostedDraft(30)
    render(React.createElement(MonitoringSection, { initialDrafts: [draft] }))
    expect(screen.getByText(/30分前のツイート/)).toBeTruthy()
  })

  it('2時間超の投稿は表示されない', () => {
    const draft = makePostedDraft(130)
    render(React.createElement(MonitoringSection, { initialDrafts: [draft] }))
    expect(screen.queryByText(/130分前のツイート/)).toBeNull()
  })

  it('初動モニタリング中の見出しが表示される', () => {
    const draft = makePostedDraft(30)
    render(React.createElement(MonitoringSection, { initialDrafts: [draft] }))
    expect(screen.getByText(/初動モニタリング/)).toBeTruthy()
  })
})
