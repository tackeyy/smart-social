'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Plan } from '@/types/subscription'

// ─── 定数 ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'free' as Plan,
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: '個人利用・お試しに',
    badge: null,
    features: [
      'Xアカウント連携：1アカウント',
      'AI生成：月10件',
      'スケジュール投稿：月5件',
      '文体プロファイル：なし',
      'Auto-plug：なし',
      'Evergreen：なし',
      'チームメンバー：1名',
    ],
  },
  {
    key: 'pro' as Plan,
    name: 'Pro',
    monthlyPrice: 4980,
    yearlyPrice: 47800,
    description: '本格的なSNS運用に',
    badge: '人気No.1',
    features: [
      'Xアカウント連携：3アカウント',
      'AI生成：月100件',
      'スケジュール投稿：無制限',
      '文体プロファイル：あり',
      'Auto-plug：3ルール',
      'Evergreen：3ルール',
      'チームメンバー：1名',
    ],
  },
  {
    key: 'business' as Plan,
    name: 'Business',
    monthlyPrice: 12800,
    yearlyPrice: 122900,
    description: 'チーム・企業アカウントに',
    badge: null,
    features: [
      'Xアカウント連携：10アカウント',
      'AI生成：無制限',
      'スケジュール投稿：無制限',
      '文体プロファイル：あり',
      'Auto-plug：無制限',
      'Evergreen：無制限',
      'チームメンバー：最大5名',
    ],
  },
] as const

// ─── 型 ─────────────────────────────────────────────────────────────────────

interface BillingClientProps {
  currentPlan: Plan
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
}

// ─── ヘルパー ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatPrice(yen: number): string {
  if (yen === 0) return '¥0'
  return `¥${yen.toLocaleString('ja-JP')}`
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export function BillingClient({
  currentPlan,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  hasStripeCustomer,
}: BillingClientProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isPending, startTransition] = useTransition()
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null)
  const [isPortalPending, setIsPortalPending] = useState(false)

  async function handleUpgrade(plan: Plan) {
    if (plan === 'free') return
    setLoadingPlan(plan)
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, billing }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          console.error('[Billing] checkout error:', data.error)
        }
      } catch (err) {
        console.error('[Billing] unexpected error:', err)
      } finally {
        setLoadingPlan(null)
      }
    })
  }

  async function handlePortal() {
    setIsPortalPending(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('[Billing] portal error:', data.error)
      }
    } catch (err) {
      console.error('[Billing] portal unexpected error:', err)
    } finally {
      setIsPortalPending(false)
    }
  }

  const yearlyDiscountPct = 20 // Pro: 4980*12=59760 → 47800 ≈ 20%off

  return (
    <div className="space-y-8">
      {/* 現在のプラン情報 */}
      {currentPlan !== 'free' && (
        <Card className="bg-manavi-bg-accent border-manavi-primary/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-manavi-navy-light uppercase tracking-wider mb-1">
                  現在のプラン
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-manavi-navy">
                    {currentPlan === 'pro' ? 'Pro' : 'Business'}
                  </span>
                  {cancelAtPeriodEnd && (
                    <span className="text-sm text-manavi-error font-medium">
                      （期間終了後にキャンセル予定）
                    </span>
                  )}
                </div>
                {currentPeriodEnd && (
                  <p className="text-sm text-manavi-navy-light mt-1">
                    {cancelAtPeriodEnd ? '解約日：' : '次回更新日：'}
                    {formatDate(currentPeriodEnd)}
                  </p>
                )}
              </div>
              {hasStripeCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  disabled={isPortalPending}
                  className="shrink-0 border-manavi-border text-manavi-navy hover:bg-manavi-bg"
                >
                  {isPortalPending ? '移動中...' : 'プラン管理・解約'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 月払い/年払いトグル */}
      <div className="flex justify-center">
        <div
          className="inline-flex items-center rounded-full border border-manavi-border bg-white p-1 shadow-[var(--shadow-manavi-sm)]"
          role="group"
          aria-label="支払い周期の選択"
        >
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors duration-150 ${
              billing === 'monthly'
                ? 'bg-manavi-primary text-white shadow-sm'
                : 'text-manavi-navy-light hover:text-manavi-navy'
            }`}
            aria-pressed={billing === 'monthly'}
          >
            月払い
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors duration-150 flex items-center gap-2 ${
              billing === 'yearly'
                ? 'bg-manavi-primary text-white shadow-sm'
                : 'text-manavi-navy-light hover:text-manavi-navy'
            }`}
            aria-pressed={billing === 'yearly'}
          >
            年払い
            <span
              className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${
                billing === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-manavi-success-bg text-manavi-success'
              }`}
            >
              {yearlyDiscountPct}%OFF
            </span>
          </button>
        </div>
      </div>

      {/* プランカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key
          const isPro = plan.key === 'pro'
          const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
          const perMonth =
            billing === 'yearly' && plan.yearlyPrice > 0
              ? Math.round(plan.yearlyPrice / 12)
              : null

          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col transition-shadow duration-200 ${
                isPro
                  ? 'border-manavi-primary shadow-[0_0_0_2px_#0284FE] shadow-[var(--shadow-manavi-md)]'
                  : 'border-manavi-border hover:shadow-[var(--shadow-manavi-md)]'
              }`}
            >
              {/* おすすめバッジ */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-manavi-primary text-white text-xs px-3 py-0.5 shadow-sm whitespace-nowrap">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-manavi-navy">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-xs font-medium bg-manavi-navy/10 text-manavi-navy rounded-full px-2.5 py-0.5">
                      現在のプラン
                    </span>
                  )}
                </div>

                {/* 価格表示 */}
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-manavi-navy tabular-nums">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-manavi-navy-light">
                        {billing === 'yearly' ? '/年' : '/月'}
                      </span>
                    )}
                  </div>
                  {perMonth && (
                    <p className="text-xs text-manavi-navy-light">
                      月あたり {formatPrice(perMonth)}
                    </p>
                  )}
                  {price === 0 && (
                    <p className="text-sm text-manavi-navy-light">無料でずっと使える</p>
                  )}
                </div>

                <p className="text-sm text-manavi-muted mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6">
                {/* 機能リスト */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0 text-manavi-success"
                        aria-hidden="true"
                      />
                      <span className="text-manavi-navy">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA ボタン */}
                <div>
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full border-manavi-border text-manavi-navy-light cursor-default"
                      disabled
                      aria-label={`${plan.name}プランは現在のプランです`}
                    >
                      現在のプラン
                    </Button>
                  ) : plan.key === 'free' ? (
                    currentPlan !== 'free' && hasStripeCustomer ? (
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full border-manavi-border text-manavi-navy hover:bg-manavi-bg"
                        onClick={handlePortal}
                        disabled={isPortalPending}
                      >
                        {isPortalPending ? '移動中...' : 'ダウングレード'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full border-manavi-border text-manavi-navy-light cursor-default"
                        disabled
                      >
                        現在のプラン
                      </Button>
                    )
                  ) : (
                    <Button
                      size="default"
                      className={`w-full font-semibold ${
                        isPro
                          ? 'bg-manavi-primary hover:bg-manavi-primary-hover text-white'
                          : 'bg-manavi-navy hover:bg-manavi-navy/90 text-white'
                      }`}
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={isPending || loadingPlan === plan.key}
                      aria-label={`${plan.name}プランにアップグレード`}
                    >
                      {loadingPlan === plan.key ? '処理中...' : 'アップグレード'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 注記 */}
      <p className="text-center text-xs text-manavi-muted">
        価格はすべて税込表示です。年払いは一括請求となります。
        いつでもキャンセルでき、次回更新日まで利用できます。
      </p>
    </div>
  )
}
