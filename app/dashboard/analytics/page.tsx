'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TweetMetrics } from '@/lib/x/analytics'
import { Skeleton } from '@/components/ui/skeleton'

const TEXT_PREVIEW_LENGTH = 60

const PERIOD_OPTIONS = [
  { label: '直近10件', value: '10' },
  { label: '直近20件', value: '20' },
  { label: '直近50件', value: '50' },
  { label: '直近100件', value: '100' },
]

type SortKey = 'engagement_score' | 'impression_count' | 'like_count' | 'retweet_count'

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'スコア順', value: 'engagement_score' },
  { label: 'インプレッション順', value: 'impression_count' },
  { label: 'いいね順', value: 'like_count' },
  { label: 'RT順', value: 'retweet_count' },
]

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
        <div
          className="bg-manavi-primary rounded-full h-1.5 transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      <span className="text-xs tabular-nums font-semibold text-manavi-navy w-10 text-right">
        {Math.round(score).toLocaleString()}
      </span>
    </div>
  )
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [metrics, setMetrics] = useState<TweetMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maxResults, setMaxResults] = useState('20')
  const [sortKey, setSortKey] = useState<SortKey>('engagement_score')

  const load = useCallback(async (results: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ max_results: results })
      if (accountId) params.set('x_account_id', accountId)
      const res = await fetch(`/smart-social/api/analytics?${params.toString()}`)
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as TweetMetrics[]
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    void load(maxResults)
  }, [load, maxResults])

  const sorted = [...metrics].sort((a, b) => b[sortKey] - a[sortKey])
  const maxScore = Math.max(...metrics.map(m => m.engagement_score), 0)

  const totalImpressions = metrics.reduce((sum, m) => sum + m.impression_count, 0)
  const totalLikes = metrics.reduce((sum, m) => sum + m.like_count, 0)
  const totalRetweets = metrics.reduce((sum, m) => sum + m.retweet_count, 0)
  const avgEngagementRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.engagement_rate, 0) / metrics.length
      : 0

  const top3 = [...metrics].sort((a, b) => b.engagement_score - a.engagement_score).slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">分析</h1>
        <div className="flex items-center gap-2">
          <select
            value={maxResults}
            onChange={e => setMaxResults(e.target.value)}
            className="text-xs border border-manavi-border rounded-md px-2 py-1.5 text-manavi-navy bg-white focus:outline-none focus:ring-1 focus:ring-manavi-primary"
            aria-label="表示件数"
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-xs border border-manavi-border rounded-md px-2 py-1.5 text-manavi-navy bg-white focus:outline-none focus:ring-1 focus:ring-manavi-primary"
            aria-label="ソート順"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[6px]" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">合計インプレッション</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{totalImpressions.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">合計いいね</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{totalLikes.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">合計RT</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{totalRetweets.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">平均エンゲージメント率</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{formatRate(avgEngagementRate)}</p>
              </CardContent>
            </Card>
          </div>

          {/* スコアTop3 */}
          {top3.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">スコアTop 3</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {top3.map((m, idx) => (
                  <div key={m.tweet_id} className="flex items-start gap-3">
                    <span className="text-xs font-bold text-manavi-navy-light w-4 shrink-0 pt-0.5">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate mb-1" title={m.text}>{m.text}</p>
                      <ScoreBar score={m.engagement_score} max={maxScore} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ツイートごとのメトリクス表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ツイート別メトリクス（{maxResults}件）</CardTitle>
            </CardHeader>
            <CardContent>
              {sorted.length === 0 ? (
                <p className="text-sm text-gray-500">データがありません</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[240px]">本文</TableHead>
                        <TableHead className="text-right">いいね</TableHead>
                        <TableHead className="text-right">RT</TableHead>
                        <TableHead className="text-right">引用</TableHead>
                        <TableHead className="text-right">返信</TableHead>
                        <TableHead className="text-right">インプレッション</TableHead>
                        <TableHead className="text-right">E率</TableHead>
                        <TableHead className="min-w-[160px]" title="RT×20 + 引用×15 + 返信×13.5">スコア</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((m) => (
                        <TableRow key={m.tweet_id}>
                          <TableCell className="font-medium">
                            <span title={m.text}>{truncate(m.text, TEXT_PREVIEW_LENGTH)}</span>
                          </TableCell>
                          <TableCell className="text-right">{m.like_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{m.retweet_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{m.quote_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{m.reply_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{m.impression_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{formatRate(m.engagement_rate)}</TableCell>
                          <TableCell>
                            <ScoreBar score={m.engagement_score} max={maxScore} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[6px]" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  )
}
