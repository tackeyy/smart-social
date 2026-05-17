import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AccountSelector } from '@/components/AccountSelector'
import { NavBar } from '@/components/NavBar'
import { PlanBadge } from '@/components/billing/PlanBadge'
import type { XAccount } from '@/types/app'
import type { Plan } from '@/types/subscription'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: accounts } = await supabase
    .from('x_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const xAccounts = (accounts ?? []) as XAccount[]

  if (xAccounts.length === 0) {
    redirect('/setup')
  }

  const currentAccount = xAccounts[0]

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentPlan: Plan = (subscription?.plan as Plan) ?? 'free'

  return (
    <div className="min-h-screen bg-manavi-bg">
      <NavBar
        desktopRightSlot={
          <>
            <AccountSelector
              accounts={xAccounts}
              currentAccountId={currentAccount.id}
            />
            <PlanBadge plan={currentPlan} />
            <span className="text-xs text-white/40 truncate max-w-[180px]">
              {user.email}
            </span>
          </>
        }
        mobileContextSlot={
          <>
            <AccountSelector
              accounts={xAccounts}
              currentAccountId={currentAccount.id}
            />
            <PlanBadge plan={currentPlan} />
            <span className="min-w-0 basis-full text-xs text-white/45 truncate">
              {user.email}
            </span>
          </>
        }
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
