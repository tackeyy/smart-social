'use client'

import { useEffect, useState } from 'react'
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

const TEXT_PREVIEW_LENGTH = 60

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<TweetMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // x_account_id は未指定で先頭アカウントを使用
        const res = await fetch('/smart-social/api/analytics?max_results=20')
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
  }, [])

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
      <h1 className="text-2xl font-bold">分析</h1>

      {loading && (
        <p className="text-sm text-gray-500">データを取得中...</p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  合計インプレッション
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">合計いいね</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">合計RT</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalRetweets.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  平均エンゲージメント率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRate(avgEngagementRate)}</p>
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
                <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">本文</TableHead>
                      <TableHead className="text-right">いいね</TableHead>
                      <TableHead className="text-right">RT</TableHead>
                      <TableHead className="text-right">リプライ</TableHead>
                      <TableHead className="text-right">インプレッション</TableHead>
                      <TableHead className="text-right">エンゲージメント率</TableHead>
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
                          {m.reply_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.impression_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRate(m.engagement_rate)}
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
