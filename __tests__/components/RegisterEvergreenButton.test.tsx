import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { RegisterEvergreenButton } from '@/components/evergreen/RegisterButton'
import { toast } from 'sonner'

const mockToastSuccess = vi.mocked(toast.success)
const mockToastError = vi.mocked(toast.error)

const defaultProps = {
  tweetId: 'tweet-123',
  content: 'テスト投稿内容',
  score: 500,
  accountId: '42',
}

describe('RegisterEvergreenButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn()
    localStorage.clear()
  })

  it('初期状態でボタンが表示される', () => {
    render(React.createElement(RegisterEvergreenButton, defaultProps))
    expect(screen.getByRole('button', { name: /エバーグリーンに登録する/ })).toBeTruthy()
  })

  it('accountId が null のとき disabled になる', () => {
    render(React.createElement(RegisterEvergreenButton, { ...defaultProps, accountId: null }))
    const button = screen.getByRole('button')
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('localStorage に登録済みマークがある場合「登録済み」テキストを表示する', () => {
    localStorage.setItem('evergreen_registered_tweet-123', '1')
    render(React.createElement(RegisterEvergreenButton, defaultProps))
    expect(screen.getByText('登録済み')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('クリックすると POST /api/evergreen/rules を呼ぶ', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rule-1' }),
    })

    render(React.createElement(RegisterEvergreenButton, defaultProps))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/evergreen/rules'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"source_tweet_id":"tweet-123"'),
        })
      )
    })
  })

  it('登録成功時にトーストを表示し「登録済み」テキストに切り替わる', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rule-1' }),
    })

    render(React.createElement(RegisterEvergreenButton, defaultProps))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('エバーグリーンに登録しました')
      expect(screen.getByText('登録済み')).toBeTruthy()
    })
  })

  it('登録成功後に localStorage にマークが保存される', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'rule-1' }),
    })

    render(React.createElement(RegisterEvergreenButton, defaultProps))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(localStorage.getItem('evergreen_registered_tweet-123')).toBe('1')
    })
  })

  it('API失敗時にエラートーストを表示しボタンに戻る', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: '登録エラー' }),
    })

    render(React.createElement(RegisterEvergreenButton, defaultProps))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('登録エラー')
      expect(screen.getByRole('button')).toBeTruthy()
    })
  })

  it('登録中はボタンが disabled になり「登録中...」と表示される', async () => {
    let resolveFetch: (v: unknown) => void
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((res) => { resolveFetch = res })
    )

    render(React.createElement(RegisterEvergreenButton, defaultProps))
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('登録中...')).toBeTruthy()

    resolveFetch!({ ok: true, json: async () => ({ id: 'rule-1' }) })
  })
})
