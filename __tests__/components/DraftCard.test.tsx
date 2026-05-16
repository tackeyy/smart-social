import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { DraftCard } from '@/components/drafts/DraftCard'
import type { Draft } from '@/types/app'

function makeDraft(overrides?: Partial<Draft>): Draft {
  return {
    id: 'draft-1',
    user_id: 'user-uuid-1',
    x_account_id: 1,
    content: 'テスト投稿内容',
    type: 'original',
    status: 'pending',
    scheduled_at: null,
    posted_at: null,
    retry_count: 0,
    last_error: null,
    posted_tweet_id: null,
    source_tweet_id: null,
    source_tweet_text: null,
    ai_candidates: null,
    selected_index: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('DraftCard', () => {
  it('ステータスバッジが表示される', () => {
    render(React.createElement(DraftCard, { draft: makeDraft(), onStatusChange: vi.fn() }))
    expect(screen.getByText('承認待ち')).toBeTruthy()
  })

  it('作成日時が表示される', () => {
    render(React.createElement(DraftCard, { draft: makeDraft(), onStatusChange: vi.fn() }))
    // 日時テキストが存在することを確認（フォーマットは locale 依存）
    const dateElements = screen.getAllByText(/2024/)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('CardHeaderが flex-wrap クラスを持つ', () => {
    const { container } = render(
      React.createElement(DraftCard, { draft: makeDraft(), onStatusChange: vi.fn() })
    )
    const header = container.querySelector('[class*="flex-wrap"]')
    expect(header).toBeTruthy()
  })
})
