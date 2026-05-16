import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  describe('ツイート削除ボタン', () => {
    it('投稿済みでposted_tweet_idがある場合は削除ボタンが表示される', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ status: 'posted', posted_tweet_id: 'tweet-123' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.getByRole('button', { name: 'ツイートを削除' })).toBeTruthy()
    })

    it('pending状態の場合は削除ボタンが表示されない', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ status: 'pending' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.queryByRole('button', { name: 'ツイートを削除' })).toBeNull()
    })

    it('posted_tweet_idがnullの場合は削除ボタンが表示されない', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ status: 'posted', posted_tweet_id: null }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.queryByRole('button', { name: 'ツイートを削除' })).toBeNull()
    })
  })

  describe('メディア添付UI', () => {
    it('pending状態のカードに画像を添付ボタンが表示される', () => {
      render(React.createElement(DraftCard, { draft: makeDraft(), onStatusChange: vi.fn() }))
      expect(screen.getByLabelText(/画像を添付/)).toBeTruthy()
    })

    it('画像添付ボタンはimage/*のみ受け付けるファイル入力に紐付いている', () => {
      render(React.createElement(DraftCard, { draft: makeDraft(), onStatusChange: vi.fn() }))
      const input = screen.getByLabelText(/画像を添付/) as HTMLInputElement
      expect(input.type).toBe('file')
      expect(input.accept).toContain('image/')
    })

    it('pending以外のステータスでは画像を添付ボタンが表示されない', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ status: 'posted' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.queryByLabelText(/画像を添付/)).toBeNull()
    })
  })

  describe('外部リンク警告バナー', () => {
    it('外部URLを含むコンテンツの場合は警告バナーが表示される', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ content: '詳しくはこちら https://example.com をご覧ください' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/外部リンクを含む投稿はリーチが/)).toBeTruthy()
    })

    it('外部URLを含まないコンテンツの場合は警告バナーが表示されない', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ content: '普通のツイートです。URLはありません。' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('x.comのURLのみの場合は警告バナーが表示されない', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ content: 'こちらの投稿を参照 https://x.com/user/status/123' }),
        onStatusChange: vi.fn(),
      }))
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('×ボタンで警告バナーを閉じることができる', () => {
      render(React.createElement(DraftCard, {
        draft: makeDraft({ content: '詳しくはこちら https://example.com をご覧ください' }),
        onStatusChange: vi.fn(),
      }))
      const dismissButton = screen.getByRole('button', { name: '警告を閉じる' })
      fireEvent.click(dismissButton)
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
})
