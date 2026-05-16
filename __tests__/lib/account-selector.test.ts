import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// next/navigation をモック
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

import { AccountSelector } from '@/components/AccountSelector'
import type { XAccount } from '@/types/app'

function makeAccount(id: number, screen_name: string): XAccount {
  return {
    id,
    user_id: 'user-1',
    x_user_id: String(id * 100),
    screen_name,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('AccountSelector', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('アカウントが0件の場合は何も表示しない', () => {
    const { container } = render(
      React.createElement(AccountSelector, { accounts: [], currentAccountId: 0 })
    )
    expect(container.firstChild).toBeNull()
  })

  it('アカウントが1件の場合はscreen_nameをテキストで表示する', () => {
    const accounts = [makeAccount(1, 'testuser')]
    render(
      React.createElement(AccountSelector, { accounts, currentAccountId: 1 })
    )
    expect(screen.getByText('@testuser')).toBeTruthy()
  })

  it('アカウントが1件の場合はSelectを表示しない', () => {
    const accounts = [makeAccount(1, 'testuser')]
    render(
      React.createElement(AccountSelector, { accounts, currentAccountId: 1 })
    )
    // role=combobox は Select の trigger が持つ
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('アカウントが複数の場合はSelectコンボボックスを表示する', () => {
    const accounts = [makeAccount(1, 'userA'), makeAccount(2, 'userB')]
    render(
      React.createElement(AccountSelector, { accounts, currentAccountId: 1 })
    )
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('アカウントが複数の場合はaria-labelが設定されている', () => {
    const accounts = [makeAccount(1, 'userA'), makeAccount(2, 'userB')]
    render(
      React.createElement(AccountSelector, { accounts, currentAccountId: 1 })
    )
    const combobox = screen.getByRole('combobox')
    expect(combobox.getAttribute('aria-label')).toBe('Xアカウントを切り替え')
  })
})
