'use client'

import { useEffect, useState, useCallback } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface MentionTweet {
  id: string
  text: string
  created_at: string
  author_id?: string
}

interface MentionAuthor {
  id: string
  name: string
  username: string
}

interface MentionsResponse {
  data?: MentionTweet[]
  includes?: { users?: MentionAuthor[] }
  error?: string
}

function MentionsContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [mentions, setMentions] = useState<MentionTweet[]>([])
  const [authors, setAuthors] = useState<Record<string, MentionAuthor>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ max_results: '20' })
      if (accountId) params.set('x_account_id', accountId)
      const res = await fetch(`/smart-social/api/x/mentions?${params}`, { cache: 'no-store' })
      const text = await res.text()
      let data: MentionsResponse
      try {
        data = JSON.parse(text) as MentionsResponse
      } catch {
        throw new Error(`サーバーエラー (${res.status}): レスポンスが不正です`)
      }
      if (!res.ok) throw new Error(data.error ?? 'メンションの取得に失敗しました')
      setMentions(data.data ?? [])
      const userMap: Record<string, MentionAuthor> = {}
      for (const u of data.includes?.users ?? []) {
        userMap[u.id] = u
      }
      setAuthors(userMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleGenerateReply(mention: MentionTweet) {
    const xAccountId = accountId
    if (!xAccountId) {
      toast.error('Xアカウントが選択されていません')
      return
    }
    setGenerating(mention.id)
    try {
      const tweetUrl = `https://x.com/i/web/status/${mention.id}`
      const res = await fetch('/smart-social/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_account_id: xAccountId,
          source_tweet_url: tweetUrl,
          source_tweet_text: mention.text,
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
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">メンション受信トレイ</h1>
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

      {!loading && !error && mentions.length === 0 && (
        <p className="text-center text-manavi-muted py-12 text-sm">メンションがありません</p>
      )}

      {!loading && !error && mentions.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          {mentions.map((mention) => {
            const author = mention.author_id ? authors[mention.author_id] : null
            return (
              <Card key={mention.id}>
                <CardContent className="pt-4 pb-3 px-4 space-y-2">
                  {author && (
                    <p className="text-xs font-medium text-manavi-navy">
                      @{author.username} ({author.name})
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{mention.text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-manavi-muted">
                      {new Date(mention.created_at).toLocaleString('ja-JP')}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://x.com/i/web/status/${mention.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        X で見る
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateReply(mention)}
                        disabled={generating === mention.id}
                        aria-label="このメンションへの返信を生成"
                      >
                        {generating === mention.id ? '生成中...' : '返信を生成'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MentionsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    }>
      <MentionsContent />
    </Suspense>
  )
}
