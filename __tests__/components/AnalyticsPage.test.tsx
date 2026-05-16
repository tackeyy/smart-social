import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React, { Suspense } from 'react'

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}))

import { useSearchParams } from 'next/navigation'
import AnalyticsPage from '@/app/dashboard/analytics/page'

const mockUseSearchParams = vi.mocked(useSearchParams)

function makeSearchParams(params: Record<string, string>) {
  return {
    get: (key: string) => params[key] ?? null,
    toString: () => new URLSearchParams(params).toString(),
  } as unknown as ReturnType<typeof useSearchParams>
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  it('account_id なしの場合は x_account_id クエリなしで fetch する', async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams({}))

    render(React.createElement(Suspense, { fallback: null }, React.createElement(AnalyticsPage)))

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const url = calls[0]?.[0] as string
      expect(url).not.toContain('x_account_id')
    })
  })

  it('account_id=42 の場合は x_account_id=42 で fetch する', async () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams({ account_id: '42' }))

    render(React.createElement(Suspense, { fallback: null }, React.createElement(AnalyticsPage)))

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const url = calls[0]?.[0] as string
      expect(url).toContain('x_account_id=42')
    })
  })

  it('ローディング中はSkeletonが表示される（aria-busy=true）', () => {
    mockUseSearchParams.mockReturnValue(makeSearchParams({}))
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

    render(React.createElement(Suspense, { fallback: null }, React.createElement(AnalyticsPage)))

    const busyEl = document.querySelector('[aria-busy="true"]')
    expect(busyEl).toBeTruthy()
  })

  it('account_id が変わった場合は新しい x_account_id で再fetchする', async () => {
    // 最初のレンダリング（account_id なし）
    mockUseSearchParams.mockReturnValue(makeSearchParams({}))
    const { rerender } = render(
      React.createElement(Suspense, { fallback: null }, React.createElement(AnalyticsPage))
    )

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(0)
    })

    const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    // account_id=99 に切り替え
    mockUseSearchParams.mockReturnValue(makeSearchParams({ account_id: '99' }))
    rerender(
      React.createElement(Suspense, { fallback: null }, React.createElement(AnalyticsPage))
    )

    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(callsBefore)
      const lastUrl = calls[calls.length - 1][0] as string
      expect(lastUrl).toContain('x_account_id=99')
    })
  })
})
