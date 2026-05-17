'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { XAccount } from '@/types/app'

interface AccountsClientProps {
  accounts: XAccount[]
}

export function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<XAccount | null>(null)

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      const res = await fetch(`/smart-social/api/accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error ?? '削除に失敗しました')
        return
      }
      toast.success('アカウント連携を解除しました')
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error('削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">アカウント管理</h1>
        <a href="/smart-social/api/auth/x/initiate">
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
                  onClick={() => setDeleteTarget(account)}
                  disabled={deletingId === account.id}
                >
                  {deletingId === account.id ? '削除中...' : '削除'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アカウント連携を解除</DialogTitle>
            <DialogDescription>
              @{deleteTarget?.screen_name} の連携を解除します。解除後も再連携できます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingId !== null}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => { if (deleteTarget) void handleDelete(deleteTarget.id) }}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? '解除中...' : '解除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
