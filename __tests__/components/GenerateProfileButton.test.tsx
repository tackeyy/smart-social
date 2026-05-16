import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { GenerateProfileButton } from '@/components/GenerateProfileButton'
import { toast } from 'sonner'

const mockToastSuccess = vi.mocked(toast.success)
const mockToastError = vi.mocked(toast.error)

describe('GenerateProfileButton', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn()
  })

  it('xAccountId が渡された場合、/api/accounts を呼ばずに直接 generate を呼ぶ', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(React.createElement(GenerateProfileButton, { xAccountId: 42 }))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/generate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ x_account_id: '42' }),
        })
      )
    })
  })

  it('成功時にトーストを表示する', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(React.createElement(GenerateProfileButton, { xAccountId: 1 }))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('プロファイルを更新しました')
    })
  })

  it('生成中はボタンが無効化され "生成中..." と表示される', async () => {
    let resolveGenerate: (v: unknown) => void
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((res) => { resolveGenerate = res })
    )

    render(React.createElement(GenerateProfileButton, { xAccountId: 1 }))
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('生成中...')).toBeTruthy()

    resolveGenerate!({ ok: true, json: async () => ({}) })
  })

  it('API失敗時にエラートーストを表示する', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server Error' }),
    })

    render(React.createElement(GenerateProfileButton, { xAccountId: 1 }))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Server Error')
    })
  })

  it('xAccountId なし（旧動作）でも accounts API → generate の順で呼ぶ', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 99 }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    render(React.createElement(GenerateProfileButton))
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/profile/generate'),
        expect.objectContaining({ body: JSON.stringify({ x_account_id: '99' }) })
      )
    })
  })
})
