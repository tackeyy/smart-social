'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const MONITOR_INTERVAL_MS = 30 * 1000

interface PostedDraft {
  id: string
  content: string
  posted_at: string | null
  posted_tweet_id: string | null
  status: string
}

interface MonitoringSectionProps {
  initialDrafts?: PostedDraft[]
}

function elapsedMinutes(postedAt: string): number {
  return Math.floor((Date.now() - new Date(postedAt).getTime()) / 60000)
}

function remainingMinutes(postedAt: string): number {
  return Math.max(0, 120 - elapsedMinutes(postedAt))
}

function urgencyVariant(elapsed: number): 'default' | 'secondary' | 'destructive' {
  if (elapsed < 60) return 'destructive'   // 1時間未満: 赤（最重要）
  if (elapsed < 90) return 'default'        // 1〜1.5時間: 青
  return 'secondary'                         // 1.5〜2時間: グレー
}

export function MonitoringSection({ initialDrafts = [] }: MonitoringSectionProps) {
  const [drafts, setDrafts] = useState<PostedDraft[]>(initialDrafts)
  const [now, setNow] = useState(Date.now())

  // 30秒ごとにドラフトを再取得 + 時刻更新
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch('/smart-social/api/drafts?status=posted&limit=10')
        if (res.ok) {
          const data = (await res.json()) as PostedDraft[]
          setDrafts(data)
        }
      } catch {
        // サイレントフェイル
      }
      setNow(Date.now())
    }

    const timer = setInterval(refresh, MONITOR_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const active = drafts.filter(d => {
    if (!d.posted_at) return false
    return Date.now() - new Date(d.posted_at).getTime() < TWO_HOURS_MS
  })

  if (active.length === 0) return null

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
          初動モニタリング中 ({active.length}件)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.map(d => {
          const elapsed = elapsedMinutes(d.posted_at!)
          const remaining = remainingMinutes(d.posted_at!)
          return (
            <div key={d.id} className="flex items-start justify-between gap-2 rounded-md bg-white border border-orange-100 px-3 py-2">
              <p className="text-xs text-manavi-navy-light line-clamp-2 flex-1">{d.content}</p>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={urgencyVariant(elapsed)} className="text-xs">
                  残{remaining}分
                </Badge>
                {d.posted_tweet_id && (
                  <a
                    href={`https://x.com/i/web/status/${d.posted_tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    X で見る
                  </a>
                )}
              </div>
            </div>
          )
        })}
        <p className="text-xs text-manavi-muted" suppressHydrationWarning>
          30秒ごとに自動更新 — 最終更新: {new Date(now).toLocaleTimeString('ja-JP')}
        </p>
      </CardContent>
    </Card>
  )
}
