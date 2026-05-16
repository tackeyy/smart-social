'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { XAccount } from '@/types/app'

interface AccountsClientProps {
  accounts: XAccount[]
}

export function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleDelete(id: number) {
    if (!confirm('このアカウントの連携を解除しますか？')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        alert(body.error ?? '削除に失敗しました')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">アカウント管理</h1>
        <a href="/api/auth/x/initiate">
          <Button>Xアカウントを連携する</Button>
        </a>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-500">連携中のXアカウントがありません。</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  @{account.screen_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <span className="text-sm text-gray-500">@{account.screen_name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                  disabled={deletingId === account.id}
                >
                  {deletingId === account.id ? '削除中...' : '削除'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
