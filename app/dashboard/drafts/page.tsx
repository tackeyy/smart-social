'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { DraftCard } from '@/components/drafts/DraftCard'
import { Badge } from '@/components/ui/badge'
import type { Draft, DraftStatus } from '@/types/app'

const STATUS_TABS: { value: DraftStatus | 'all'; label: string }[] = [
  { value: 'pending', label: '承認待ち' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'posted', label: '投稿済み' },
  { value: 'all', label: 'すべて' },
]

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [activeTab, setActiveTab] = useState<DraftStatus | 'all'>('pending')
  const [loading, setLoading] = useState(true)

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
    // 楽観的更新: リストからフィルタリング or ステータス更新
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    )
  }

  const displayedDrafts = activeTab === 'all'
    ? drafts
    : drafts.filter((d) => d.status === activeTab)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ドラフト一覧</h1>

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
    </div>
  )
}
