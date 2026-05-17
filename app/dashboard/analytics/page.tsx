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
import type { UserStats } from '@/app/api/x/user-stats/route'
import { Skeleton } from '@/components/ui/skeleton'
import { analyzeOptimalPostingTimes } from '@/lib/analytics/optimal-posting-time'
import { RegisterEvergreenButton } from '@/components/evergreen/RegisterButton'

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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px]">
      <p className="text-xs font-medium text-manavi-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-manavi-navy">{value}</p>
    </div>
  )
}

function TweetMetricCard({
  metric,
  maxScore,
  accountId,
}: {
  metric: TweetMetrics
  maxScore: number
  accountId: string | null
}) {
  return (
    <article className="rounded-md border border-manavi-border bg-white p-4">
      <p className="line-clamp-3 text-sm font-medium text-manavi-navy" title={metric.text}>
        {metric.text}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <SummaryStat label="インプレッション" value={metric.impression_count.toLocaleString()} />
        <SummaryStat label="E率" value={formatRate(metric.engagement_rate)} />
        <SummaryStat label="いいね" value={metric.like_count.toLocaleString()} />
        <SummaryStat label="RT" value={metric.retweet_count.toLocaleString()} />
        <SummaryStat label="引用" value={metric.quote_count.toLocaleString()} />
        <SummaryStat label="返信" value={metric.reply_count.toLocaleString()} />
      </div>
      <div className="mt-4">
        <ScoreBar score={metric.engagement_score} max={maxScore} />
      </div>
      <div className="mt-4">
        <RegisterEvergreenButton
          tweetId={metric.tweet_id}
          content={metric.text}
          score={metric.engagement_score}
          accountId={accountId}
        />
      </div>
    </article>
  )
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [metrics, setMetrics] = useState<TweetMetrics[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
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

      const [metricsRes, statsRes] = await Promise.all([
        fetch(`/smart-social/api/analytics?${params.toString()}`),
        fetch(`/smart-social/api/x/user-stats${accountId ? `?x_account_id=${accountId}` : ''}`),
      ])

      if (!metricsRes.ok) {
        const body = (await metricsRes.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${metricsRes.status}`)
      }
      const data = (await metricsRes.json()) as TweetMetrics[]
      setMetrics(data)

      if (statsRes.ok) {
        const stats = (await statsRes.json()) as UserStats
        setUserStats(stats)
      }
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
  const optimalTimes = analyzeOptimalPostingTimes(metrics)
  const maxOptimalScore = Math.max(...optimalTimes.map(t => t.avg_score), 0)

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
          {/* ツイートごとのメトリクス */}
          <section className="rounded-md border border-manavi-border bg-white">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-manavi-navy">ツイート別メトリクス（{maxResults}件）</h2>
            </div>
            <div className="px-6 pb-6">
              {sorted.length === 0 ? (
                <p className="text-sm text-gray-500">データがありません</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {sorted.map((m) => (
                      <TweetMetricCard
                        key={m.tweet_id}
                        metric={m}
                        maxScore={maxScore}
                        accountId={accountId}
                      />
                    ))}
                  </div>
                  <div className="hidden md:block">
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
                          <TableHead className="w-[140px]"></TableHead>
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
                            <TableCell>
                              <RegisterEvergreenButton
                                tweetId={m.tweet_id}
                                content={m.text}
                                score={m.engagement_score}
                                accountId={accountId}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-md border border-manavi-border bg-white p-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryStat label="合計インプレッション" value={totalImpressions.toLocaleString()} />
              <SummaryStat label="平均エンゲージメント率" value={formatRate(avgEngagementRate)} />
              <SummaryStat label="合計いいね" value={totalLikes.toLocaleString()} />
              <SummaryStat label="合計RT" value={totalRetweets.toLocaleString()} />
            </div>
            {userStats && (
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-manavi-border pt-4 text-sm lg:grid-cols-4">
                <SummaryStat label="フォロワー数" value={userStats.followers_count.toLocaleString()} />
                <SummaryStat label="フォロー中" value={userStats.following_count.toLocaleString()} />
                <SummaryStat label="総ツイート数" value={userStats.tweet_count.toLocaleString()} />
                <SummaryStat label="リスト掲載数" value={userStats.listed_count.toLocaleString()} />
              </div>
            )}
          </section>

          {/* 最適投稿時間 */}
          {(top3.length > 0 || optimalTimes.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {top3.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">スコアTop 3</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {top3.map((m, idx) => (
                      <div key={m.tweet_id} className="flex items-start gap-3">
                        <span className="w-4 shrink-0 pt-0.5 text-xs font-bold text-manavi-navy-light">#{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 truncate text-xs text-gray-700" title={m.text}>{m.text}</p>
                          <ScoreBar score={m.engagement_score} max={maxScore} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {optimalTimes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">最適投稿時間（JST）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="mb-3 text-xs text-gray-500">過去{maxResults}件のデータから算出したエンゲージメントスコア平均</p>
                    {optimalTimes.map((t, idx) => (
                      <div key={t.hour} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-xs font-bold text-manavi-navy-light">#{idx + 1}</span>
                        <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-manavi-navy">
                          {String(t.hour).padStart(2, '0')}:00
                        </span>
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all duration-300"
                            style={{ width: maxOptimalScore > 0 ? `${(t.avg_score / maxOptimalScore) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                          avg {Math.round(t.avg_score)} ({t.count}件)
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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
