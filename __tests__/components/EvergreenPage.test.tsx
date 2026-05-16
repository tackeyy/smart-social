import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React, { Suspense } from 'react'

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useSearchParams } from 'next/navigation'
import EvergreenPage from '@/app/dashboard/evergreen/page'

const mockUseSearchParams = vi.mocked(useSearchParams)

function makeSearchParams(params: Record<string, string>) {
  return {
    get: (key: string) => params[key] ?? null,
  } as unknown as ReturnType<typeof useSearchParams>
}

const sampleRules = [
  {
    id: 'rule-1',
    x_account_id: 42,
    source_tweet_id: 'tweet-1',
    source_content: 'エバーグリーンな投稿テキスト',
    interval_days: 30,
    run_count: 1,
    max_runs: null,
    enabled: true,
    next_run_at: new Date('2026-06-01T00:00:00Z').toISOString(),
    created_at: new Date('2026-05-01T00:00:00Z').toISOString(),
  },
]

describe('EvergreenPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseSearchParams.mockReturnValue(makeSearchParams({}))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleRules,
    })
  })

  it('ページタイトルが表示される', async () => {
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.getByText('エバーグリーン管理')).toBeTruthy()
    })
  })

  it('ローディング中は aria-busy=true の要素が表示される', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('ルール一覧が表示される', async () => {
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.getByText(/エバーグリーンな投稿テキスト/)).toBeTruthy()
    })
  })

  it('ルールがない場合は空メッセージを表示する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.getByText(/エバーグリーンルールがありません/)).toBeTruthy()
    })
  })

  it('有効ルールには「有効」バッジが表示される', async () => {
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.getByText('有効')).toBeTruthy()
    })
  })

  it('無効ルールには「無効」バッジが表示される', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ ...sampleRules[0], enabled: false }],
    })
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.getByText('無効')).toBeTruthy()
    })
  })

  it('account_id フィルタリングが機能する', async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams({ account_id: '99' }))
    const rules = [
      { ...sampleRules[0], x_account_id: 42 },
      { ...sampleRules[0], id: 'rule-2', x_account_id: 99, source_content: '別アカウントの投稿' },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => rules,
    })
    render(React.createElement(Suspense, { fallback: null }, React.createElement(EvergreenPage)))
    await waitFor(() => {
      expect(screen.queryByText(/エバーグリーンな投稿テキスト/)).toBeNull()
      expect(screen.getByText(/別アカウントの投稿/)).toBeTruthy()
    })
  })
})
