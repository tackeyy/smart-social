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

function extractPlanFromMetadata(metadata: Stripe.Metadata): Plan | null {
  const plan = metadata.plan
  if (plan === 'pro' || plan === 'business') return plan
  if (plan === 'free') return 'free'
  return null
}

function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active': return 'active'
    case 'trialing': return 'trialing'
    case 'canceled': return 'canceled'
    case 'past_due': return 'past_due'
    case 'incomplete': return 'incomplete'
    default: return 'incomplete'
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
    console.error('[Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
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
        if (!plan) {
          console.error('[Webhook] checkout.session.completed: unknown plan in metadata, skipping')
          break
        }

        const { error: upsertError } = await supabase.from('subscriptions').upsert(
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
        if (upsertError) {
          console.error('[Webhook] DB upsert failed (checkout.session.completed):', upsertError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
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

        const { error: updatePaymentError } = await supabase
          .from('subscriptions')
          .update({ current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        if (updatePaymentError) {
          console.error('[Webhook] DB update failed (invoice.payment_succeeded):', updatePaymentError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { error: updateFailedError } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        if (updateFailedError) {
          console.error('[Webhook] DB update failed (invoice.payment_failed):', updateFailedError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
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

        if (!plan) {
          // planが不明な場合はプランフィールドを変更せずにstatusと期間のみ更新
          console.warn('[Webhook] customer.subscription.updated: unknown plan in metadata, skipping plan update')
          const { error: updateStatusOnlyError } = await supabase
            .from('subscriptions')
            .update({
              status,
              current_period_end: periodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId)
          if (updateStatusOnlyError) {
            console.error('[Webhook] DB update failed (customer.subscription.updated/status-only):', updateStatusOnlyError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
          }
          break
        }

        const { error: updateSubError } = await supabase
          .from('subscriptions')
          .update({
            plan,
            status,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        if (updateSubError) {
          console.error('[Webhook] DB update failed (customer.subscription.updated):', updateSubError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { error: updateDeletedError } = await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
        if (updateDeletedError) {
          console.error('[Webhook] DB update failed (customer.subscription.deleted):', updateDeletedError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }
        break
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[Webhook] Processing failed:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
