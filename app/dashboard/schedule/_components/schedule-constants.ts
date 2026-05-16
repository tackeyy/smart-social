import type { DraftStatus } from '@/types/app'

export const STATUS_LABEL: Partial<Record<DraftStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>> = {
  scheduled: { label: '待機中',  variant: 'secondary' },
  posted:    { label: '投稿済み', variant: 'default' },
  failed:    { label: '失敗',    variant: 'destructive' },
}

export const STATUS_STYLE: Partial<Record<DraftStatus, string>> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  posted:    'bg-secondary text-secondary-foreground border-transparent',
  failed:    'bg-destructive text-destructive-foreground border-transparent',
}

export function formatJST(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
