'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormState {
  x_username: string
  display_name: string
  x_user_id: string
}

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    x_username: '',
    display_name: '',
    x_user_id: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.x_username.trim() || !form.display_name.trim() || !form.x_user_id.trim()) {
      setError('すべての項目を入力してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/smart-social/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_username: form.x_username.trim(),
          display_name: form.display_name.trim(),
          x_user_id: form.x_user_id.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error ?? `エラーが発生しました (${res.status})`
        )
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
                @ユーザー名{' '}
                <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="x_username"
                name="x_username"
                type="text"
                value={form.x_username}
                onChange={handleChange}
                placeholder="zeimu_ai（@なしで入力）"
                disabled={submitting}
                required
                aria-required="true"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="display_name" className="text-sm font-medium">
                表示名{' '}
                <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={form.display_name}
                onChange={handleChange}
                placeholder="ぜいみー🦉"
                disabled={submitting}
                required
                aria-required="true"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="x_user_id" className="text-sm font-medium">
                X User ID{' '}
                <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="x_user_id"
                name="x_user_id"
                type="text"
                value={form.x_user_id}
                onChange={handleChange}
                placeholder="2035049358547369984（数値文字列）"
                disabled={submitting}
                required
                aria-required="true"
                inputMode="numeric"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? '設定中...' : '設定する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
