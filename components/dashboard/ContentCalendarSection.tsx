import Link from 'next/link'
import type { ContentCalendarEvent } from '@/types/content-calendar'

interface Props {
  events: ContentCalendarEvent[]
}

export function ContentCalendarSection({ events }: Props) {
  if (events.length === 0) return null

  return (
    <section aria-label="今月のホットトピック">
      <h2 className="text-lg font-semibold mb-3">今月のホットトピック</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="rounded-lg border bg-card p-4 space-y-2">
            <h3 className="font-medium text-sm">{event.title}</h3>
            {event.description && (
              <p className="text-xs text-muted-foreground">{event.description}</p>
            )}
            <ul className="space-y-1">
              {event.suggested_topics.map((topic) => (
                <li key={topic} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-foreground">{topic}</span>
                  <Link
                    href={`/dashboard/drafts?topic=${encodeURIComponent(topic)}`}
                    className="shrink-0 text-xs text-blue-600 hover:underline"
                  >
                    このネタでドラフト作成
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
