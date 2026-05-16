'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

interface AutoPlugRule {
  id: string
  threshold_type: 'likes' | 'retweets' | 'replies'
  threshold_value: number
  template_text: string
  max_executions: number
  enabled: boolean
  created_at: string
}

const THRESHOLD_LABELS: Record<string, string> = {
  likes: 'いいね',
  retweets: 'RT',
  replies: '返信',
}

function AutoPlugContent() {
  const searchParams = useSearchParams()
  const accountId = searchParams.get('account_id')

  const [rules, setRules] = useState<AutoPlugRule[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    threshold_type: 'likes',
    threshold_value: 50,
    template_text: '',
    max_executions: 1,
  })

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = accountId ? `?x_account_id=${accountId}` : ''
      const res = await fetch(`/smart-social/api/auto-plug/rules${params}`)
      if (res.ok) {
        const data = (await res.json()) as AutoPlugRule[]
        setRules(data)
      }
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => { void loadRules() }, [loadRules])

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!accountId) {
      toast.error('アカウントを選択してください')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/smart-social/api/auto-plug/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, x_account_id: Number(accountId) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '作成失敗')
      }
      toast.success('Auto-plugルールを作成しました')
      setShowForm(false)
      setForm({ threshold_type: 'likes', threshold_value: 50, template_text: '', max_executions: 1 })
      await loadRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(rule: AutoPlugRule) {
    try {
      const res = await fetch(`/smart-social/api/auto-plug/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })
      if (!res.ok) throw new Error('更新失敗')
      await loadRules()
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このルールを削除しますか？')) return
    try {
      const res = await fetch(`/smart-social/api/auto-plug/rules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除失敗')
      toast.success('ルールを削除しました')
      await loadRules()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">Auto-plug設定</h1>
          <p className="text-xs text-manavi-muted mt-0.5">
            エンゲージメント閾値を超えた投稿に自動でリプライを追加します
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'キャンセル' : '+ ルールを追加'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">新しいルールを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-manavi-muted block mb-1">トリガー</label>
                  <select
                    value={form.threshold_type}
                    onChange={e => setForm(f => ({ ...f, threshold_type: e.target.value }))}
                    className="w-full text-sm border border-manavi-border rounded-md px-2 py-1.5 text-manavi-navy bg-white"
                  >
                    <option value="likes">いいね数</option>
                    <option value="retweets">RT数</option>
                    <option value="replies">返信数</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-manavi-muted block mb-1">閾値（最低10）</label>
                  <Input
                    type="number"
                    min={10}
                    value={form.threshold_value}
                    onChange={e => setForm(f => ({ ...f, threshold_value: Number(e.target.value) }))}
                    className="text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-manavi-muted block mb-1">
                  Auto-plugテキスト（{form.template_text.length}/280）
                </label>
                <Textarea
                  value={form.template_text}
                  onChange={e => setForm(f => ({ ...f, template_text: e.target.value }))}
                  rows={3}
                  maxLength={280}
                  placeholder="例: 詳細はこちら👇 https://example.com"
                  className="text-sm resize-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-manavi-muted block mb-1">最大実行回数（1〜3）</label>
                <Input
                  type="number"
                  min={1}
                  max={3}
                  value={form.max_executions}
                  onChange={e => setForm(f => ({ ...f, max_executions: Number(e.target.value) }))}
                  className="text-sm w-24"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? '作成中...' : 'ルールを作成'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <p className="text-center text-manavi-muted py-8 text-sm">ルールがありません</p>
      )}

      {!loading && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? '有効' : '無効'}
                      </Badge>
                      <span className="text-xs text-manavi-muted">
                        {THRESHOLD_LABELS[rule.threshold_type]}{rule.threshold_value}件以上でトリガー
                      </span>
                      <span className="text-xs text-manavi-muted">
                        ・最大{rule.max_executions}回
                      </span>
                    </div>
                    <p className="text-sm text-manavi-navy-light bg-manavi-bg rounded-md px-2 py-1">
                      {rule.template_text}
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

export default function AutoPlugPage() {
  return (
    <Suspense fallback={<div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}>
      <AutoPlugContent />
    </Suspense>
  )
}
