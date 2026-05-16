'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { EvergreenRule } from '@/lib/evergreen/scheduler'

const CONTENT_PREVIEW_LENGTH = 80

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function EvergreenContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [rules, setRules] = useState<EvergreenRule[]>([])
  const [loading, setLoading] = useState(true)

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/smart-social/api/evergreen/rules')
      if (res.ok) {
        const data = (await res.json()) as EvergreenRule[]
        const filtered = accountId
          ? data.filter(r => String(r.x_account_id) === accountId)
          : data
        setRules(filtered)
      }
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  async function handleToggle(rule: EvergreenRule) {
    try {
      const res = await fetch(`/smart-social/api/evergreen/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })
      if (!res.ok) throw new Error('更新失敗')
      await loadRules()
      toast.success(rule.enabled ? '無効化しました' : '有効化しました')
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このルールを削除しますか？')) return
    try {
      const res = await fetch(`/smart-social/api/evergreen/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除失敗')
      toast.success('ルールを削除しました')
      await loadRules()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">エバーグリーン管理</h1>
        <p className="text-xs text-manavi-muted mt-0.5">
          高エンゲージメントの投稿を定期的に自動再投稿します
        </p>
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[6px]" />
          ))}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <p className="text-center text-manavi-muted py-8 text-sm">
          エバーグリーンルールがありません。分析ページから登録してください。
        </p>
      )}

      {!loading && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className="shadow-manavi-sm rounded-[6px] border-manavi-border">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? '有効' : '無効'}
                      </Badge>
                      <span className="text-xs text-manavi-muted">
                        {rule.interval_days}日ごと
                      </span>
                      <span className="text-xs text-manavi-muted">
                        実行: {rule.run_count}{rule.max_runs !== null ? `/${rule.max_runs}` : ''}回
                      </span>
                    </div>
                    <p
                      className="text-sm text-manavi-navy-light bg-manavi-bg rounded-md px-2 py-1.5 truncate"
                      title={rule.source_content}
                    >
                      {truncate(rule.source_content, CONTENT_PREVIEW_LENGTH)}
                    </p>
                    <p className="text-xs text-manavi-muted">
                      次回実行: {rule.next_run_at ? new Date(rule.next_run_at).toLocaleString('ja-JP') : '未定'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleToggle(rule)}>
                      {rule.enabled ? '無効化' : '有効化'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(rule.id)}>
                      削除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EvergreenPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[6px]" />
        ))}
      </div>
    }>
      <EvergreenContent />
    </Suspense>
  )
}
