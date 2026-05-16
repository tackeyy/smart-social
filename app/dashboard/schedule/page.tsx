'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ScheduledPost, Draft } from '@/types/app'

interface ScheduledPostWithDraft extends ScheduledPost {
  drafts: Draft | null
}

const STATUS_LABEL: Record<ScheduledPost['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待機中', variant: 'secondary' },
  posted: { label: '投稿済み', variant: 'default' },
  failed: { label: '失敗', variant: 'destructive' },
}

const MAX_CHARS = 280

function formatJST(isoString: string): string {
  return new Date(isoString).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// datetime-local の min 値用に JST の現在時刻を返す
function getJSTNow(): string {
  const now = new Date()
  // JST = UTC+9
  const jstOffset = 9 * 60
  const localOffset = now.getTimezoneOffset()
  const jstDate = new Date(now.getTime() + (jstOffset + localOffset) * 60 * 1000)
  return jstDate.toISOString().slice(0, 16)
}

export default function SchedulePage() {
  const [posts, setPosts] = useState<ScheduledPostWithDraft[]>([])
  const [loading, setLoading] = useState(true)

  // 新規作成フォーム state
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/smart-social/api/schedule')
      if (!res.ok) throw new Error('取得失敗')
      const data: ScheduledPostWithDraft[] = await res.json()
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !scheduledAt) return
    setCreating(true)
    try {
      // Step 1: ドラフトを作成
      const draftRes = await fetch('/smart-social/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      })
      if (!draftRes.ok) throw new Error('ドラフト作成失敗')
      const draft: Draft = await draftRes.json()

      // Step 2: datetime-local の値はブラウザのローカル時刻→ISO変換
      const scheduledISO = new Date(scheduledAt).toISOString()

      // Step 3: スケジュール登録
      const schedRes = await fetch('/smart-social/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, scheduled_at: scheduledISO }),
      })
      if (!schedRes.ok) throw new Error('スケジュール登録失敗')

      toast.success('スケジュールを登録しました')
      setText('')
      setScheduledAt('')
      await fetchPosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/smart-social/api/schedule/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) throw new Error('削除失敗')
      toast.success('スケジュールを削除しました')
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">スケジュール管理</h1>

      {/* 新規作成フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">新規スケジュール投稿</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="投稿内容を入力..."
                rows={4}
                className="resize-none"
                aria-label="投稿内容"
                required
              />
              <span
                className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}
                aria-live="polite"
              >
                {charCount} / {MAX_CHARS}
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="scheduled-at" className="text-sm font-medium text-gray-700">
                投稿日時（日本時間）
              </label>
              <input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={getJSTNow()}
                required
                className="block border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              />
            </div>

            <Button
              type="submit"
              disabled={creating || isOverLimit || !text.trim() || !scheduledAt}
            >
              {creating ? '登録中...' : '保存'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* スケジュール一覧 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">スケジュール一覧</h2>
        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">スケジュールはありません</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
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
                  const statusInfo = STATUS_LABEL[post.status]
                  const preview = post.drafts?.content ?? '—'
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="text-sm">
                        {formatJST(post.scheduled_at)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <p className="truncate">{preview}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {post.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(post.id)}
                            aria-label={`スケジュール削除: ${formatJST(post.scheduled_at)}`}
                          >
                            削除
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
