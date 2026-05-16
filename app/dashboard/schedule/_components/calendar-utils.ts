import type { Draft } from '@/types/app'

export function buildCalendarGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const startSunday = new Date(firstDay)
  startSunday.setDate(1 - firstDay.getDay())

  const grid: Date[][] = []
  const cursor = new Date(startSunday)

  for (let week = 0; week < 6; week++) {
    const row: Date[] = []
    for (let day = 0; day < 7; day++) {
      row.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    grid.push(row)
  }

  return grid
}

export function toJSTDateKey(isoString: string): string {
  const date = new Date(isoString)
  // JST (UTC+9) に変換してからキーを生成する。isoString.slice(0, 10) は使わない
  try {
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const get = (type: string) => parts.find((p) => p.type === type)?.value
    const year = get('year')
    const month = get('month')
    const day = get('day')
    if (!year || !month || !day) return 'Invalid Date'
    return `${year}-${month}-${day}`
  } catch {
    return 'Invalid Date'
  }
}

export function groupByDate(posts: Draft[], year: number, month: number): Map<string, Draft[]> {
  const map = new Map<string, Draft[]>()

  for (const post of posts) {
    if (!post.scheduled_at) continue

    const key = toJSTDateKey(post.scheduled_at)
    const [keyYear, keyMonth] = key.split('-').map(Number)

    if (keyYear !== year || keyMonth - 1 !== month) continue

    const existing = map.get(key)
    if (existing) {
      existing.push(post)
    } else {
      map.set(key, [post])
    }
  }

  return map
}
