import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', className }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    'aria-label'?: string
  }) =>
    React.createElement('button', { onClick, 'data-variant': variant, 'aria-label': ariaLabel }, children),
}))

import { CalendarDayCell } from '@/app/dashboard/schedule/_components/CalendarDayCell'
import { DraftDetailDialog } from '@/app/dashboard/schedule/_components/DraftDetailDialog'
import { ScheduleCalendarView } from '@/app/dashboard/schedule/_components/ScheduleCalendarView'
import type { Draft } from '@/types/app'

function makeDraft(overrides?: Partial<Draft>): Draft {
  return {
    id: 'draft-1',
    user_id: 'user-1',
    x_account_id: 1,
    content: 'テスト投稿内容',
    type: 'original',
    status: 'scheduled',
    scheduled_at: '2024-06-15T10:00:00Z',
    posted_at: null,
    retry_count: 0,
    last_error: null,
    posted_tweet_id: null,
    source_tweet_id: null,
    source_tweet_text: null,
    ai_candidates: null,
    selected_index: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    ...overrides,
  }
}

// ---- CalendarDayCell ----
describe('CalendarDayCell', () => {
  const baseDate = new Date(2024, 5, 15) // 2024-06-15

  it('isToday=true のとき ring-2 クラスを含む要素が存在する', () => {
    // Arrange / Act
    const { container } = render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts: [],
        isCurrentMonth: true,
        isToday: true,
        onDraftClick: vi.fn(),
      })
    )

    // Assert
    const ringEl = container.querySelector('[class*="ring-2"]')
    expect(ringEl).toBeTruthy()
  })

  it('ドラフトが0件のときバッジが表示されない', () => {
    // Arrange / Act
    render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts: [],
        isCurrentMonth: true,
        isToday: false,
        onDraftClick: vi.fn(),
      })
    )

    // Assert
    expect(screen.queryByTestId('badge')).toBeNull()
  })

  it('ドラフトが1件のとき本文が表示される', () => {
    // Arrange
    const draft = makeDraft({ content: 'テスト投稿内容' })

    // Act
    render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts: [draft],
        isCurrentMonth: true,
        isToday: false,
        onDraftClick: vi.fn(),
      })
    )

    // Assert
    expect(screen.getByText('テスト投稿内容')).toBeTruthy()
  })

  it('ドラフトが3件のとき最大2件 + "+1" が表示される', () => {
    // Arrange
    const drafts = [
      makeDraft({ id: 'd-1', content: '投稿1' }),
      makeDraft({ id: 'd-2', content: '投稿2' }),
      makeDraft({ id: 'd-3', content: '投稿3' }),
    ]

    // Act
    render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts,
        isCurrentMonth: true,
        isToday: false,
        onDraftClick: vi.fn(),
      })
    )

    // Assert: 2件表示
    expect(screen.getByText('投稿1')).toBeTruthy()
    expect(screen.getByText('投稿2')).toBeTruthy()
    // 3件目は非表示
    expect(screen.queryByText('投稿3')).toBeNull()
    // overflow バッジ +1
    expect(screen.getByTestId('badge')).toBeTruthy()
    expect(screen.getByText('+1')).toBeTruthy()
  })

  it('ドラフトバッジをクリックすると onDraftClick が呼ばれる', () => {
    // Arrange
    const onDraftClick = vi.fn()
    const draft = makeDraft()

    // Act
    render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts: [draft],
        isCurrentMonth: true,
        isToday: false,
        onDraftClick,
      })
    )
    fireEvent.click(screen.getByText('テスト投稿内容'))

    // Assert
    expect(onDraftClick).toHaveBeenCalledOnce()
    expect(onDraftClick).toHaveBeenCalledWith(draft)
  })

  it('ドラフトボタンに aria-label がある', () => {
    // Arrange
    const draft = makeDraft({ content: 'aria-labelテスト', status: 'scheduled' })

    // Act
    render(
      React.createElement(CalendarDayCell, {
        date: baseDate,
        drafts: [draft],
        isCurrentMonth: true,
        isToday: false,
        onDraftClick: vi.fn(),
      })
    )

    // Assert: aria-label で検索できる
    const btn = screen.getByLabelText(/aria-labelテスト/)
    expect(btn).toBeTruthy()
  })
})

// ---- DraftDetailDialog ----
describe('DraftDetailDialog', () => {
  it('draft=null のとき何も表示されない', () => {
    // Arrange / Act
    render(
      React.createElement(DraftDetailDialog, {
        draft: null,
        onClose: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    // Assert: dialog 要素が存在しない
    expect(screen.queryByTestId('dialog')).toBeNull()
  })

  it('status="scheduled" のときキャンセルボタンが表示される', () => {
    // Arrange
    const draft = makeDraft({ status: 'scheduled' })

    // Act
    render(
      React.createElement(DraftDetailDialog, {
        draft,
        onClose: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    // Assert
    expect(screen.getByText('キャンセル')).toBeTruthy()
  })

  it('status="posted" のときキャンセルボタンが表示されない', () => {
    // Arrange
    const draft = makeDraft({ status: 'posted' })

    // Act
    render(
      React.createElement(DraftDetailDialog, {
        draft,
        onClose: vi.fn(),
        onCancel: vi.fn(),
      })
    )

    // Assert
    expect(screen.queryByText('キャンセル')).toBeNull()
  })
})

// ---- ScheduleCalendarView（月ナビゲーション） ----
describe('ScheduleCalendarView 月ナビゲーション', () => {
  it('「次月」ボタンをクリックすると月表示が更新される', () => {
    // Arrange
    // 現在日付を 2024-06-15 に固定
    vi.setSystemTime(new Date(2024, 5, 15))

    render(
      React.createElement(ScheduleCalendarView, {
        posts: [],
        onCancel: vi.fn(),
      })
    )

    // 初期表示: 2024年6月
    expect(screen.getByText('2024年6月')).toBeTruthy()

    // Act: 次月ボタンをクリック
    const nextBtn = screen.getByLabelText('次月')
    fireEvent.click(nextBtn)

    // Assert: 2024年7月に更新される
    expect(screen.getByText('2024年7月')).toBeTruthy()

    vi.useRealTimers()
  })

  it('「前月」ボタンをクリックすると月表示が更新される', () => {
    // Arrange
    vi.setSystemTime(new Date(2024, 5, 15))

    render(
      React.createElement(ScheduleCalendarView, {
        posts: [],
        onCancel: vi.fn(),
      })
    )

    // 初期表示: 2024年6月
    expect(screen.getByText('2024年6月')).toBeTruthy()

    // Act: 前月ボタンをクリック
    const prevBtn = screen.getByLabelText('前月')
    fireEvent.click(prevBtn)

    // Assert: 2024年5月に更新される
    expect(screen.getByText('2024年5月')).toBeTruthy()

    vi.useRealTimers()
  })
})
