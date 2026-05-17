'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Draft } from '@/types/app'
import { Skeleton } from '@/components/ui/skeleton'
import { ScheduleCalendarView } from './_components/ScheduleCalendarView'
import { STATUS_LABEL, formatJST } from './_components/schedule-constants'

const MAX_CHARS = 280

// datetime-local の min 値用に JST の現在時刻を返す（Intl.DateTimeFormat でタイムゾーン安全に計算）
function getJSTNow(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  // datetime-local の値形式: "YYYY-MM-DDTHH:mm"
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

type TabType = 'table' | 'calendar'

function ScheduleContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')
  const [posts, setPosts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('table')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // 新規作成フォーム state
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/smart-social/api/schedule')
      if (!res.ok) throw new Error('取得失敗')
      const data: Draft[] = await res.json()
      setPosts(data)
    } catch {
      toast.error('スケジュールの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!text.trim() || !scheduledAt) return
    setCreating(true)
    try {
      // Step 1: ドラフトを作成
      const draftRes = await fetch('/smart-social/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text.trim(),
          type: 'post',
          ...(accountId ? { x_account_id: accountId } : {}),
        }),
      })
      if (!draftRes.ok) throw new Error('ドラフト作成失敗')
      const draft: Draft = await draftRes.json()

      // Step 2: datetime-local の値はブラウザのローカル時刻→ISO変換
      const scheduledISO = new Date(scheduledAt).toISOString()

      // Step 3: drafts に scheduled_at をセット（status: 'scheduled' に更新）
      const schedRes = await fetch('/smart-social/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, scheduled_at: scheduledISO }),
      })
      if (!schedRes.ok) throw new Error('スケジュール登録失敗')

      toast.success('スケジュールを登録しました')
      setText('')
      setScheduledAt('')
      setCreateDialogOpen(false)
      await fetchPosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  async function handleCancel(id: string) {
    try {
      // DELETE → drafts の status を 'pending' に戻す（scheduled_at を null に）
      const res = await fetch(`/smart-social/api/schedule/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) throw new Error('キャンセル失敗')
      toast.success('スケジュールをキャンセルしました')
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error('キャンセルに失敗しました')
    }
  }

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const scheduledCount = posts.filter((post) => post.status === 'scheduled').length

  function resetCreateDialog(open: boolean) {
    setCreateDialogOpen(open)
    if (!open && !creating) {
      setText('')
      setScheduledAt('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">スケジュール管理</h1>
          <p className="mt-1 text-sm text-manavi-muted">予約中 {scheduledCount}件 / 全体 {posts.length}件</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>新規作成</Button>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={resetCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スケジュール投稿を作成</DialogTitle>
            <DialogDescription>
              投稿本文と公開日時を指定して、予約一覧に追加します。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="投稿内容を入力..."
                rows={5}
                className="resize-none"
                aria-label="投稿内容"
                required
              />
              <span
                className={`block text-right text-xs ${isOverLimit ? 'font-medium text-red-500' : 'text-manavi-muted'}`}
                aria-live="polite"
              >
                {charCount} / {MAX_CHARS}
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="scheduled-at" className="text-sm font-medium text-manavi-navy-light">
                投稿日時（日本時間）
              </label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={getJSTNow()}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetCreateDialog(false)}
                disabled={creating}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={creating || isOverLimit || !text.trim() || !scheduledAt}
              >
                {creating ? '登録中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* スケジュール一覧 */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-manavi-navy">予約ワークスペース</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={tab === 'table' ? 'default' : 'outline'}
              onClick={() => setTab('table')}
              aria-pressed={tab === 'table'}
            >
              リスト
            </Button>
            <Button
              size="sm"
              variant={tab === 'calendar' ? 'default' : 'outline'}
              onClick={() => setTab('calendar')}
              aria-pressed={tab === 'calendar'}
            >
              カレンダー
            </Button>
          </div>
        </div>

        {tab === 'calendar' ? (
          loading ? (
            <div className="space-y-2" aria-live="polite" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <ScheduleCalendarView posts={posts} onCancel={handleCancel} />
          )
        ) : loading ? (
          <div className="space-y-2" aria-live="polite" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-manavi-muted text-sm py-8 text-center" aria-live="polite">スケジュールはありません</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {posts.map((post) => {
                const statusInfo = STATUS_LABEL[post.status] ?? { label: post.status, variant: 'outline' as const }
                const preview = post.content || '—'
                const postScheduledAt = post.scheduled_at ?? ''
                return (
                  <article key={post.id} className="rounded-md border border-manavi-border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-manavi-navy">
                          {postScheduledAt ? formatJST(postScheduledAt) : '日時未設定'}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm text-manavi-navy-light">{preview}</p>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    {post.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="mt-3 w-full"
                        onClick={() => handleCancel(post.id)}
                        aria-label={`スケジュールキャンセル: ${postScheduledAt ? formatJST(postScheduledAt) : ''}`}
                      >
                        キャンセル
                      </Button>
                    )}
                  </article>
                )
              })}
            </div>

            <div className="hidden rounded-md border border-manavi-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">投稿日時</TableHead>
                    <TableHead className="min-w-[200px]">内容プレビュー</TableHead>
                    <TableHead className="min-w-[90px]">ステータス</TableHead>
                    <TableHead className="w-20 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const statusInfo = STATUS_LABEL[post.status] ?? { label: post.status, variant: 'outline' as const }
                    const preview = post.content || '—'
                    const postScheduledAt = post.scheduled_at ?? ''
                    return (
                      <TableRow key={post.id}>
                        <TableCell className="text-sm">
                          {postScheduledAt ? formatJST(postScheduledAt) : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm">
                          <p className="truncate">{preview}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {post.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(post.id)}
                              aria-label={`スケジュールキャンセル: ${postScheduledAt ? formatJST(postScheduledAt) : ''}`}
                            >
                              キャンセル
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />
        ))}
      </div>
    }>
      <ScheduleContent />
    </Suspense>
  )
}
