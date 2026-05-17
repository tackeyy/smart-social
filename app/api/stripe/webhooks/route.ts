export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import type { Plan, SubscriptionStatus } from '@/types/subscription'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function extractPlanFromMetadata(metadata: Stripe.Metadata): Plan {
  const plan = metadata.plan
  if (plan === 'pro' || plan === 'business') return plan
  return 'free'
}

function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active': return 'active'
    case 'trialing': return 'trialing'
    case 'canceled': return 'canceled'
    case 'past_due': return 'past_due'
    case 'incomplete': return 'incomplete'
    default: return 'active'
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: '署名がありません' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = extractPlanFromMetadata(session.metadata ?? {})
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string | null

        if (!userId || !customerId) break

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const rawSubscription = (invoice as unknown as { subscription?: string | { id: string } }).subscription
        const subscriptionId = rawSubscription
          ? (typeof rawSubscription === 'string' ? rawSubscription : rawSubscription.id)
          : null

        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const firstItem = subscription.items.data[0]
        const periodEnd = firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : new Date().toISOString()

        await supabase
          .from('subscriptions')
          .update({ current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const plan = extractPlanFromMetadata(subscription.metadata)
        const status = toSubscriptionStatus(subscription.status)
        const subFirstItem = subscription.items.data[0]
        const periodEnd = subFirstItem
          ? new Date(subFirstItem.current_period_end * 1000).toISOString()
          : new Date().toISOString()

        await supabase
          .from('subscriptions')
          .update({
            plan,
            status,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        break
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
