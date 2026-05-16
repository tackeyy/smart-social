'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/smart-social/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-manavi-bg px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[6px] bg-manavi-primary mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 text-white"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10M7 12h10m-7 4h7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-manavi-navy">
            Smart Social
          </h1>
          <p className="text-sm text-manavi-navy-light mt-1">
            アカウントにサインイン
          </p>
        </div>

        <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
          <CardHeader className="pb-4 pt-6 px-6">
            <h2 className="text-base font-medium text-manavi-navy">
              メールアドレスで続ける
            </h2>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {sent ? (
              <div className="rounded-[6px] bg-manavi-success-bg border border-manavi-success/30 px-4 py-3">
                <p className="text-sm font-medium text-manavi-success">
                  マジックリンクを送信しました
                </p>
                <p className="text-xs text-manavi-navy-light mt-1">
                  メールを確認してリンクをクリックしてください。
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-manavi-navy"
                  >
                    メールアドレス
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-[4px]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-[4px] bg-manavi-primary hover:bg-manavi-primary-hover transition-colors duration-150"
                >
                  {loading ? '送信中...' : 'マジックリンクを送信'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-manavi-muted mt-6">
          ログインすることで、利用規約とプライバシーポリシーに同意したことになります。
        </p>
      </div>
    </div>
  )
}
