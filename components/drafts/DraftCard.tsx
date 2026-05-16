'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Draft, DraftStatus } from '@/types/app'

const STATUS_LABEL: Record<DraftStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:    { label: '承認待ち',       variant: 'secondary' },
  approved:   { label: '承認済み',       variant: 'default' },
  scheduled:  { label: 'スケジュール済み', variant: 'default' },
  processing: { label: '処理中',         variant: 'secondary' },
  posted:     { label: '投稿済み',       variant: 'outline' },
  rejected:   { label: '却下',           variant: 'destructive' },
  failed:     { label: '投稿失敗',       variant: 'destructive' },
}

const MAX_CHARS = 280

interface DraftCardProps {
  draft: Draft
  onStatusChange: (id: string, newStatus: DraftStatus) => void
}

export function DraftCard({ draft, onStatusChange }: DraftCardProps) {
  const [content, setContent] = useState(draft.content)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  async function saveEdit() {
    if (content === draft.content) {
      setIsEditing(false)
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/smart-social/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('保存失敗')
      setIsEditing(false)
      toast.success('ドラフトを保存しました')
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleApprove() {
    if (isOverLimit) return
    setIsSubmitting(true)
    try {
      // 編集済みの場合は先に保存してから承認
      if (content !== draft.content) {
        const saveRes = await fetch(`/smart-social/api/drafts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (!saveRes.ok) throw new Error('保存失敗')
      }

      const res = await fetch(`/smart-social/api/drafts/${draft.id}/approve`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '承認失敗')
      }
      toast.success('投稿しました！')
      onStatusChange(draft.id, 'posted')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '投稿に失敗しました'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/smart-social/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) throw new Error('却下失敗')
      toast.success('ドラフトを却下しました')
      onStatusChange(draft.id, 'rejected')
    } catch {
      toast.error('却下に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const status = STATUS_LABEL[draft.status]
  const isActionable = draft.status === 'pending'

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-y-1">
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {draft.posted_at && (
            <span className="text-xs text-gray-400">
              投稿: {new Date(draft.posted_at).toLocaleString('ja-JP')}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(draft.created_at).toLocaleString('ja-JP')}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              aria-label="ドラフト本文編集"
            />
            <div className="flex justify-between items-center">
              <span
                className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}
                aria-live="polite"
              >
                {charCount} / {MAX_CHARS}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setContent(draft.content)
                    setIsEditing(false)
                  }}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={isSubmitting || isOverLimit}
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
            <span className="text-xs text-gray-400">
              {charCount} 文字
            </span>
          </div>
        )}
      </CardContent>

      {isActionable && !isEditing && (
        <CardFooter className="flex gap-2 pt-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isSubmitting}
          >
            編集
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            却下
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isSubmitting || isOverLimit}
            className="ml-auto"
          >
            {isSubmitting ? '処理中...' : '承認して投稿'}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
