'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [xUserId, setXUserId] = useState('')
  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookupUser(value: string) {
    const handle = value.trim().replace(/^@/, '')
    if (!handle) return

    setLooking(true)
    setLookupError(null)
    setDisplayName('')
    setXUserId('')

    try {
      const res = await fetch(`/smart-social/api/x/lookup-user?username=${encodeURIComponent(handle)}`)
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error ?? 'ユーザー情報の取得に失敗しました')
        return
      }
      setDisplayName(data.display_name)
      setXUserId(data.x_user_id)
    } catch {
      setLookupError('ネットワークエラーが発生しました')
    } finally {
      setLooking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !displayName || !xUserId) {
      setError('@ユーザー名を入力してユーザー情報を取得してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/smart-social/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen_name: username.trim().replace(/^@/, ''),
          x_user_id: xUserId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `エラーが発生しました (${res.status})`)
      }

      router.push('/dashboard/drafts')
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Xアカウントを設定してください</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="x_username" className="text-sm font-medium">
                @ユーザー名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="x_username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setLookupError(null) }}
                onBlur={(e) => lookupUser(e.target.value)}
                placeholder="zeimu_ai（@なしで入力）"
                disabled={submitting}
              />
              {lookupError && (
                <p className="text-xs text-manavi-error">{lookupError}</p>
              )}
            </div>

            {(looking || displayName) && (
              <div className="rounded-[6px] border border-manavi-border bg-manavi-bg px-4 py-3 space-y-1">
                {looking ? (
                  <p className="text-sm text-manavi-navy-light">取得中...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-manavi-navy">{displayName}</p>
                    <p className="text-xs text-manavi-navy-light">ID: {xUserId}</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-manavi-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || looking || !displayName}
              className="w-full"
            >
              {submitting ? '設定中...' : '設定する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
