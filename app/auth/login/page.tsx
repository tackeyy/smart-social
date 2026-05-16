'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/smart-social/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `エラーが発生しました (${res.status})`)
      }
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-manavi-bg px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
            <svg viewBox="0 0 512 512" className="w-12 h-12">
              <defs>
                <linearGradient id="ss-login" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0083FF"/>
                  <stop offset="100%" stopColor="#00B4D8"/>
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="112" fill="url(#ss-login)"/>
              <line x1="256" y1="256" x2="256" y2="122" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <line x1="256" y1="256" x2="372" y2="189" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <line x1="256" y1="256" x2="372" y2="323" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <line x1="256" y1="256" x2="256" y2="390" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <line x1="256" y1="256" x2="140" y2="323" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <line x1="256" y1="256" x2="140" y2="189" stroke="white" strokeWidth="8" opacity="0.5" strokeLinecap="round"/>
              <circle cx="256" cy="110" r="20" fill="white" opacity="0.8"/>
              <circle cx="384" cy="178" r="20" fill="white" opacity="0.8"/>
              <circle cx="384" cy="334" r="20" fill="white" opacity="0.8"/>
              <circle cx="256" cy="402" r="20" fill="white" opacity="0.8"/>
              <circle cx="128" cy="334" r="20" fill="white" opacity="0.8"/>
              <circle cx="128" cy="178" r="20" fill="white" opacity="0.8"/>
              <path d="M256 190 L270 244 L324 256 L270 268 L256 322 L242 268 L188 256 L242 244 Z" fill="white"/>
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
                {error && (
                  <div className="rounded-[6px] bg-red-50 border border-manavi-error/30 px-4 py-3">
                    <p className="text-sm text-manavi-error">{error}</p>
                  </div>
                )}
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
