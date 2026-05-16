'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { DraftCard } from '@/components/drafts/DraftCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Draft, DraftStatus, XAccount } from '@/types/app'

const STATUS_TABS: { value: DraftStatus | 'all'; label: string }[] = [
  { value: 'pending', label: '承認待ち' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'posted', label: '投稿済み' },
  { value: 'all', label: 'すべて' },
]

interface GenerateFormState {
  sourceTweetUrl: string
  sourceTweetText: string
  instruction: string
}

function GenerateDraftDialog({
  open,
  onOpenChange,
  onSuccess,
  xAccountId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  xAccountId: string
}) {
  const [form, setForm] = useState<GenerateFormState>({
    sourceTweetUrl: '',
    sourceTweetText: '',
    instruction: '',
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleGenerate() {
    if (!form.sourceTweetUrl.trim()) {
      setError('リプライ元ツイートURLを入力してください')
      return
    }
    if (!form.sourceTweetText.trim()) {
      setError('元ツイートの内容を入力してください')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/smart-social/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_account_id: xAccountId,
          source_tweet_url: form.sourceTweetUrl.trim(),
          source_tweet_text: form.sourceTweetText.trim(),
          ...(form.instruction.trim() && { instruction: form.instruction.trim() }),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error ?? `エラーが発生しました (${res.status})`
        )
      }

      toast.success('ドラフトを生成しました')
      onOpenChange(false)
      setForm({ sourceTweetUrl: '', sourceTweetText: '', instruction: '' })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ドラフトの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  function handleClose() {
    if (generating) return
    onOpenChange(false)
    setForm({ sourceTweetUrl: '', sourceTweetText: '', instruction: '' })
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>ドラフトを生成</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="sourceTweetUrl" className="text-sm font-medium">
              リプライ元ツイートURL <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="sourceTweetUrl"
              name="sourceTweetUrl"
              type="url"
              value={form.sourceTweetUrl}
              onChange={handleChange}
              placeholder="https://x.com/..."
              disabled={generating}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sourceTweetText" className="text-sm font-medium">
              元ツイートの内容 <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <Textarea
              id="sourceTweetText"
              name="sourceTweetText"
              value={form.sourceTweetText}
              onChange={handleChange}
              placeholder="ツイートの内容を貼り付けてください"
              disabled={generating}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="instruction" className="text-sm font-medium">
              追加指示（任意）
            </label>
            <input
              id="instruction"
              name="instruction"
              type="text"
              value={form.instruction}
              onChange={handleChange}
              placeholder="例: ポジティブなトーンで"
              disabled={generating}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={generating}>
            キャンセル
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '生成する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [activeTab, setActiveTab] = useState<DraftStatus | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentXAccountId, setCurrentXAccountId] = useState<string>('')

  useEffect(() => {
    async function fetchCurrentAccount() {
      try {
        const res = await fetch('/smart-social/api/accounts')
        if (!res.ok) return
        const data: XAccount[] = await res.json()
        if (data.length > 0) {
          setCurrentXAccountId(String(data[0].id))
        }
      } catch {
        // アカウント取得失敗時はドラフト生成ボタンを無効化するだけ
      }
    }
    fetchCurrentAccount()
  }, [])

  const fetchDrafts = useCallback(async (status: DraftStatus | 'all') => {
    setLoading(true)
    try {
      const url =
        status === 'all'
          ? '/smart-social/api/drafts'
          : `/smart-social/api/drafts?status=${status}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('取得失敗')
      const data: Draft[] = await res.json()
      setDrafts(data)
    } catch {
      toast.error('ドラフトの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDrafts(activeTab)
  }, [activeTab, fetchDrafts])

  function handleStatusChange(id: string, newStatus: DraftStatus) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    )
  }

  const displayedDrafts =
    activeTab === 'all'
      ? drafts
      : drafts.filter((d) => d.status === activeTab)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ドラフト一覧</h1>
        <Button
          onClick={() => setDialogOpen(true)}
          disabled={!currentXAccountId}
        >
          ドラフトを生成
        </Button>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-6 flex-wrap" role="tablist" aria-label="ドラフトフィルター">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ドラフト一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400" aria-live="polite">
          読み込み中...
        </div>
      ) : displayedDrafts.length === 0 ? (
        <div className="text-center py-12 text-gray-400" aria-live="polite">
          <p>ドラフトがありません</p>
          {activeTab === 'pending' && (
            <p className="text-sm mt-2">AIによる生成を待っているか、すでに処理済みです</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{displayedDrafts.length} 件</Badge>
          </div>
          {displayedDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <GenerateDraftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => fetchDrafts(activeTab)}
        xAccountId={currentXAccountId}
      />
    </div>
  )
}
