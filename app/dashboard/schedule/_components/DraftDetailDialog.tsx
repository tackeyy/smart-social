'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Draft } from '@/types/app'

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: '待機中', variant: 'secondary' },
  posted:    { label: '投稿済み', variant: 'default' },
  failed:    { label: '失敗', variant: 'destructive' },
}

function formatJST(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  draft: Draft | null
  onClose: () => void
  onCancel: (id: string) => void
}

export function DraftDetailDialog({ draft, onClose, onCancel }: Props) {
  const statusInfo = draft ? (STATUS_LABEL[draft.status] ?? { label: draft.status, variant: 'outline' as const }) : null

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle>投稿詳細</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <p className="text-sm whitespace-pre-wrap">{draft.content}</p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>予定日時:</span>
                <span>{draft.scheduled_at ? formatJST(draft.scheduled_at) : '—'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ステータス:</span>
                {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
              </div>
            </div>

            {draft.status === 'scheduled' && (
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onCancel(draft.id)
                    onClose()
                  }}
                >
                  キャンセル
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
