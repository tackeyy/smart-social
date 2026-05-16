'use client'

import { useEffect, useState, Suspense } from 'react'
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

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [metrics, setMetrics] = useState<TweetMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({ max_results: '20' })
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
    }

    void load()
  }, [accountId])

  // 集計サマリー
  const totalImpressions = metrics.reduce((sum, m) => sum + m.impression_count, 0)
  const totalLikes = metrics.reduce((sum, m) => sum + m.like_count, 0)
  const totalRetweets = metrics.reduce((sum, m) => sum + m.retweet_count, 0)
  const avgEngagementRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.engagement_rate, 0) / metrics.length
      : 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">分析</h1>

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
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">
                  合計インプレッション
                </CardTitle>
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
                <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">
                  平均エンゲージメント率
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{formatRate(avgEngagementRate)}</p>
              </CardContent>
            </Card>
          </div>

          {/* ツイートごとのメトリクス表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ツイート別メトリクス（直近20件）</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-sm text-gray-500">データがありません</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">本文</TableHead>
                      <TableHead className="text-right">いいね</TableHead>
                      <TableHead className="text-right">RT</TableHead>
                      <TableHead className="text-right">引用</TableHead>
                      <TableHead className="text-right">リプライ</TableHead>
                      <TableHead className="text-right">インプレッション</TableHead>
                      <TableHead className="text-right">エンゲージメント率</TableHead>
                      <TableHead className="text-right" title="RT×20 + 引用×15 + 返信×13.5">スコア</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => (
                      <TableRow key={m.tweet_id}>
                        <TableCell className="font-medium">
                          <span title={m.text}>{truncate(m.text, TEXT_PREVIEW_LENGTH)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {m.like_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.retweet_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.quote_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.reply_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.impression_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRate(m.engagement_rate)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-manavi-navy">
                          {Math.round(m.engagement_score).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    <Suspense fallback={<p className="text-sm text-gray-500">データを取得中...</p>}>
      <AnalyticsContent />
    </Suspense>
  )
}
