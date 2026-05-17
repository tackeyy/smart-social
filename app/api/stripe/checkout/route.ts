import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import type { Plan, BillingInterval } from '@/types/subscription'

const VALID_PAID_PLANS = ['pro', 'business'] as const
type PaidPlan = typeof VALID_PAID_PLANS[number]

const PRICE_IDS: Record<PaidPlan, Record<BillingInterval, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? '',
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID ?? '',
  },
}

function isPaidPlan(plan: unknown): plan is PaidPlan {
  return VALID_PAID_PLANS.includes(plan as PaidPlan)
}

function isValidPlan(plan: unknown): plan is Plan {
  return plan === 'free' || isPaidPlan(plan)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: { plan?: unknown; billing?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const { plan, billing = 'monthly' } = body

  if (!plan || !isValidPlan(plan)) {
    return NextResponse.json({ error: '有効なプランを指定してください' }, { status: 400 })
  }

  if (plan === 'free') {
    return NextResponse.json({ error: 'Freeプランへのチェックアウトは不要です' }, { status: 400 })
  }

  const billingInterval: BillingInterval =
    billing === 'yearly' ? 'yearly' : 'monthly'

  try {
    let stripeCustomerId: string | null = null

    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle()

      stripeCustomerId = subscription?.stripe_customer_id ?? null
    } catch {
      // DBアクセス失敗時はcustomerなしで続行
    }

    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        })
        stripeCustomerId = customer.id
      } catch {
        // customers.create失敗時はcustomerなしで続行
      }
    }

    const priceId = PRICE_IDS[plan][billingInterval]
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancel`,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
    }

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
    } else {
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: `checkout-${user.id}-${plan}-${billingInterval}-${Date.now()}` }
    )

    if (!session.url) {
      return NextResponse.json({ error: 'チェックアウトセッションの作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
