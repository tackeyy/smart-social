'use client'

import type { XAccount } from '@/types/app'

interface AccountSelectorProps {
  accounts: XAccount[]
  currentAccountId: number
  onSelect: (id: number) => void
}

export function AccountSelector({
  accounts,
  currentAccountId,
  onSelect,
}: AccountSelectorProps) {
  if (accounts.length === 0) return null

  if (accounts.length === 1) {
    return (
      <span className="text-sm text-gray-600">@{accounts[0].x_username}</span>
    )
  }

  return (
    <select
      value={currentAccountId}
      onChange={(e) => onSelect(Number(e.target.value))}
      aria-label="Xアカウントを切り替え"
      className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          @{account.x_username}
        </option>
      ))}
    </select>
  )
}
