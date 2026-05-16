'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDayCell } from './CalendarDayCell'
import { DraftDetailDialog } from './DraftDetailDialog'
import { buildCalendarGrid, groupByDate } from './calendar-utils'
import type { Draft } from '@/types/app'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

interface Props {
  posts: Draft[]
  onCancel: (id: string) => void
}

export function ScheduleCalendarView({ posts, onCancel }: Props) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)

  const grid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  const dateMap = useMemo(
    () => groupByDate(posts, currentYear, currentMonth),
    [posts, currentYear, currentMonth]
  )

  function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
  }

  function goPrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function goNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={goPrevMonth} aria-label="前月">
          ‹
        </Button>
        <span className="text-sm font-semibold text-manavi-navy min-w-[100px] text-center">
          {currentYear}年{currentMonth + 1}月
        </span>
        <Button variant="outline" size="sm" onClick={goNextMonth} aria-label="次月">
          ›
        </Button>
      </div>

      <div role="grid" className="border-l border-t border-manavi-border rounded-md overflow-hidden">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              role="columnheader"
              className="text-center text-xs font-medium text-muted-foreground py-1 border-b border-r border-manavi-border bg-muted/30"
            >
              {label}
            </div>
          ))}
        </div>

        {grid.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7">
            {week.map((date, di) => (
              <CalendarDayCell
                key={`${wi}-${di}`}
                date={date}
                drafts={dateMap.get(toDateKey(date)) ?? []}
                isCurrentMonth={date.getMonth() === currentMonth}
                isToday={isSameDay(date, today)}
                onDraftClick={setSelectedDraft}
              />
            ))}
          </div>
        ))}
      </div>

      <DraftDetailDialog
        draft={selectedDraft}
        onClose={() => setSelectedDraft(null)}
        onCancel={onCancel}
      />
    </div>
  )
}
