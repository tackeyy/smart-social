'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function GenerateProfileButton() {
  const [generating, setGenerating] = useState(false)

  async function handleClick() {
    setGenerating(true)
    try {
      const xAccountId = process.env.NEXT_PUBLIC_X_ACCOUNT_ID ?? ''
      const res = await fetch('/smart-social/api/profile/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x_account_id: xAccountId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error ?? `エラーが発生しました (${res.status})`
        )
      }

      toast.success('プロファイルを更新しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'プロファイルの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={generating}
      aria-label="文体プロファイルを生成する"
    >
      {generating ? '生成中...' : '文体プロファイルを生成'}
    </Button>
  )
}
