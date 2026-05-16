'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Draft, DraftStatus } from '@/types/app'
import { detectExternalLink } from '@/lib/utils/detectExternalLink'

const STATUS_LABEL: Record<DraftStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; description?: string }> = {
  pending:    { label: '承認待ち',        variant: 'secondary' },
  scheduled:  { label: 'スケジュール済み', variant: 'default',     description: '指定日時に自動投稿されます' },
  processing: { label: '処理中',          variant: 'secondary',   description: '投稿処理が進行中です。しばらくお待ちください' },
  posted:     { label: '投稿済み',        variant: 'outline' },
  rejected:   { label: '却下',            variant: 'destructive' },
  failed:     { label: '投稿失敗',        variant: 'destructive', description: '投稿に失敗しました。内容を確認してください' },
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
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [mediaId, setMediaId] = useState<string | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setMediaPreviewUrl(previewUrl)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/smart-social/api/media/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('アップロード失敗')
      const data = await res.json()
      setMediaId(data.media_id_string)
      toast.success('画像をアップロードしました')
    } catch {
      toast.error('画像のアップロードに失敗しました')
      URL.revokeObjectURL(previewUrl)
      setMediaPreviewUrl(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleRemoveMedia() {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaId(null)
    setMediaPreviewUrl(null)
  }

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
        ...(mediaId ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_ids: [mediaId] }),
        } : {}),
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

  async function handleDeleteTweet() {
    if (!draft.posted_tweet_id) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/smart-social/api/x/tweet/${draft.posted_tweet_id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'ツイート削除失敗')
      }
      toast.success('ツイートを削除しました')
      onStatusChange(draft.id, 'pending')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ツイートの削除に失敗しました'
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
  const isDeletable = draft.status === 'posted' && !!draft.posted_tweet_id

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={status.variant}>{status.label}</Badge>
          {status.description && (
            <span className="text-xs text-gray-500">{status.description}</span>
          )}
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
        {/* 外部リンク警告バナー */}
        {!warningDismissed && detectExternalLink(content) && (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
          >
            <span>⚠️ 外部リンクを含む投稿はリーチが低下する場合があります。</span>
            <button
              aria-label="警告を閉じる"
              onClick={() => setWarningDismissed(true)}
              className="shrink-0 text-yellow-600 hover:text-yellow-800"
            >
              ×
            </button>
          </div>
        )}

        {/* 返信元ツイート（reply 種別のみ） */}
        {draft.type === 'reply' && draft.source_tweet_text && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 space-y-0.5">
            <p className="text-xs font-medium text-gray-500">返信元ツイート</p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-3">
              {draft.source_tweet_text}
            </p>
            {draft.source_tweet_id && (
              <a
                href={`https://x.com/i/web/status/${draft.source_tweet_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                元ツイートを見る
              </a>
            )}
          </div>
        )}

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

        {/* AI候補一覧（reply 種別かつ候補が存在する場合） */}
        {draft.type === 'reply' && draft.ai_candidates && draft.ai_candidates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500">AI生成候補</p>
            <ol className="space-y-1">
              {draft.ai_candidates.map((candidate, idx) => (
                <li
                  key={idx}
                  className={`rounded-md border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                    draft.selected_index === idx
                      ? 'border-blue-400 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                  aria-label={`候補 ${idx + 1}${draft.selected_index === idx ? '（選択中）' : ''}`}
                >
                  <span className="font-medium mr-1">{idx + 1}.</span>
                  {candidate.text}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>

      {isDeletable && (
        <CardFooter className="pt-0">
          <Button
            size="sm"
            variant="destructive"
            aria-label="ツイートを削除"
            onClick={handleDeleteTweet}
            disabled={isSubmitting}
          >
            {isSubmitting ? '削除中...' : 'ツイートを削除'}
          </Button>
        </CardFooter>
      )}

      {isActionable && !isEditing && (
        <CardFooter className="flex flex-col gap-2 pt-0 items-start">
          {/* メディアプレビュー */}
          {mediaPreviewUrl && (
            <div className="relative w-full">
              <img
                src={mediaPreviewUrl}
                alt="添付画像プレビュー"
                className="h-24 w-24 rounded-md object-cover border border-gray-200"
              />
              <button
                onClick={handleRemoveMedia}
                aria-label="添付画像を削除"
                className="absolute -top-1.5 -right-1.5 left-auto rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex gap-2 w-full">
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

            {/* 画像添付 */}
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting || isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'アップロード中...' : '画像を添付'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={isSubmitting || isUploading}
              aria-label="画像を添付"
            />

            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isSubmitting || isOverLimit || isUploading}
              className="ml-auto"
            >
              {isSubmitting ? '処理中...' : '承認して投稿'}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
