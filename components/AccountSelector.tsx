'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { XAccount } from '@/types/app'

interface AccountSelectorProps {
  accounts: XAccount[]
  currentAccountId: number
}

export function AccountSelector({ accounts, currentAccountId }: AccountSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (accounts.length === 0) return null

  if (accounts.length === 1) {
    return (
      <span className="text-sm text-gray-600">@{accounts[0].screen_name}</span>
    )
  }

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('account_id', value)
    router.push(`?${params.toString()}`)
  }

  const accountIdFromUrl = searchParams.get('account_id')
  const currentValue = accountIdFromUrl ?? String(currentAccountId)

  return (
    <Select value={currentValue} onValueChange={handleSelect}>
      <SelectTrigger
        className="h-8 w-auto min-w-[140px] text-sm border-gray-200"
        aria-label="Xアカウントを切り替え"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={String(account.id)}>
            @{account.screen_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
