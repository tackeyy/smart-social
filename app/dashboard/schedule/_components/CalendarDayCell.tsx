'use client'

import { Badge } from '@/components/ui/badge'
import type { Draft } from '@/types/app'

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  posted:    'bg-secondary text-secondary-foreground border-transparent',
  failed:    'bg-destructive text-destructive-foreground border-transparent',
}

interface Props {
  date: Date
  drafts: Draft[]
  isCurrentMonth: boolean
  isToday: boolean
  onDraftClick: (draft: Draft) => void
}

export function CalendarDayCell({ date, drafts, isCurrentMonth, isToday, onDraftClick }: Props) {
  const MAX_VISIBLE = 2
  const visible = drafts.slice(0, MAX_VISIBLE)
  const overflow = drafts.length - MAX_VISIBLE

  const label = `${date.getMonth() + 1}月${date.getDate()}日`

  return (
    <div
      role="gridcell"
      aria-label={label}
      className={[
        'min-h-[80px] p-1 border-b border-r border-manavi-border flex flex-col gap-0.5',
        isCurrentMonth ? 'bg-background' : 'bg-muted/30',
        isToday ? 'ring-2 ring-blue-500 ring-inset' : '',
      ].join(' ')}
    >
      <span
        className={[
          'text-xs font-medium leading-none mb-0.5 self-end',
          isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
          isToday ? 'text-blue-600 font-bold' : '',
        ].join(' ')}
      >
        {date.getDate()}
      </span>

      {visible.map((draft) => (
        <button
          key={draft.id}
          onClick={() => onDraftClick(draft)}
          className={[
            'w-full text-left rounded px-1 py-0.5 text-[10px] leading-snug truncate border',
            STATUS_STYLE[draft.status] ?? 'bg-muted text-muted-foreground border-transparent',
          ].join(' ')}
        >
          {draft.content}
        </button>
      ))}

      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px] py-0 px-1 self-start">
          +{overflow}
        </Badge>
      )}
    </div>
  )
}
