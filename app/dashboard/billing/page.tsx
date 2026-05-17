import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BillingClient } from '@/components/billing/BillingClient'
import type { Plan } from '@/types/subscription'

export const metadata: Metadata = {
  title: 'プラン・お支払い | Smart Social',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let currentPlan: Plan = 'free'
  let currentPeriodEnd: string | null = null
  let cancelAtPeriodEnd = false
  let hasStripeCustomer = false

  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, current_period_end, cancel_at_period_end, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subscription) {
      currentPlan = (subscription.plan as Plan) ?? 'free'
      currentPeriodEnd = subscription.current_period_end ?? null
      cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false
      hasStripeCustomer = !!subscription.stripe_customer_id
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-manavi-navy">
          プラン・お支払い
        </h1>
        <p className="text-manavi-navy-light mt-1 text-sm">
          ニーズに合ったプランをお選びください。いつでも変更・解約できます。
        </p>
      </div>

      <BillingClient
        currentPlan={currentPlan}
        currentPeriodEnd={currentPeriodEnd}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
        hasStripeCustomer={hasStripeCustomer}
      />
    </div>
  )
}
