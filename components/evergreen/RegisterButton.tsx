'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const STORAGE_KEY_PREFIX = 'evergreen_registered_'

interface Props {
  tweetId: string
  content: string
  score: number
  accountId: string | null
}

type Status = 'idle' | 'loading' | 'registered'

function getStorageKey(tweetId: string) {
  return `${STORAGE_KEY_PREFIX}${tweetId}`
}

function isRegistered(tweetId: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(tweetId)) === '1'
  } catch {
    return false
  }
}

function markRegistered(tweetId: string) {
  try {
    localStorage.setItem(getStorageKey(tweetId), '1')
  } catch {
    // ignore
  }
}

export function RegisterEvergreenButton({ tweetId, content, score, accountId }: Props) {
  const [status, setStatus] = useState<Status>(() =>
    isRegistered(tweetId) ? 'registered' : 'idle'
  )

  const disabled = !accountId || status !== 'idle'

  async function handleClick() {
    if (!accountId || status !== 'idle') return
    setStatus('loading')
    try {
      const res = await fetch('/smart-social/api/evergreen/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_account_id: Number(accountId),
          source_tweet_id: tweetId,
          source_content: content,
          registered_score: score,
          interval_days: 30,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `エラー (${res.status})`)
      }
      markRegistered(tweetId)
      setStatus('registered')
      toast.success('エバーグリーンに登録しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登録に失敗しました')
      setStatus('idle')
    }
  }

  if (status === 'registered') {
    return (
      <span className="text-xs text-manavi-muted px-2">登録済み</span>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        !accountId
          ? 'アカウント選択が必要'
          : 'エバーグリーンに登録する'
      }
      title={!accountId ? 'アカウント選択が必要' : undefined}
    >
      {status === 'loading' ? '登録中...' : 'エバーグリーン登録'}
    </Button>
  )
}
