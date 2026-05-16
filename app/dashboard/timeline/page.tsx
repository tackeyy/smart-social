'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Tweet {
  id: string
  text: string
  created_at: string
}

interface TimelineResponse {
  data?: Tweet[]
  meta?: { next_token?: string }
  error?: string
}

interface XAccount {
  id: number
  screen_name: string
}

function TimelineContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [tweets, setTweets] = useState<Tweet[]>([])
  const [accounts, setAccounts] = useState<XAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null) // tweet.id

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ max_results: '20' })
      if (accountId) params.set('x_account_id', accountId)
      const res = await fetch(`/smart-social/api/x/timeline?${params}`)
      const data = (await res.json()) as TimelineResponse
      if (!res.ok) throw new Error(data.error ?? 'タイムラインの取得に失敗しました')
      setTweets(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    void load()
    fetch('/smart-social/api/accounts')
      .then(r => r.json())
      .then(setAccounts)
      .catch(() => {})
  }, [load])

  const currentAccount = accounts.find(a => String(a.id) === accountId) ?? accounts[0]

  async function handleGenerateReply(tweet: Tweet) {
    if (!currentAccount) {
      toast.error('Xアカウントが選択されていません')
      return
    }
    setGenerating(tweet.id)
    try {
      const tweetUrl = `https://x.com/i/web/status/${tweet.id}`
      const res = await fetch('/smart-social/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_account_id: String(currentAccount.id),
          source_tweet_url: tweetUrl,
          source_tweet_text: tweet.text,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '生成失敗')
      }
      toast.success('返信ドラフトを生成しました。ドラフトページで確認できます。')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成に失敗しました'
      toast.error(msg)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">タイムライン</h1>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          更新
        </Button>
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && tweets.length === 0 && (
        <p className="text-center text-manavi-muted py-12 text-sm">ツイートがありません</p>
      )}

      {!loading && !error && tweets.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {tweets.map((tweet) => (
            <Card key={tweet.id}>
              <CardContent className="pt-4 pb-3 px-4 space-y-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{tweet.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-manavi-muted">
                    {new Date(tweet.created_at).toLocaleString('ja-JP')}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://x.com/i/web/status/${tweet.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      X で見る
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateReply(tweet)}
                      disabled={generating === tweet.id}
                      aria-label={`このツイートへの返信を生成`}
                    >
                      {generating === tweet.id ? '生成中...' : '返信を生成'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tweets.length > 0 && (
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            {tweets.length} 件表示
          </Badge>
        </div>
      )}
    </div>
  )
}

export default function TimelinePage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    }>
      <TimelineContent />
    </Suspense>
  )
}
