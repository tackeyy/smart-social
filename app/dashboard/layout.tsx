import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AccountSelector } from '@/components/AccountSelector'
import { NavBar } from '@/components/NavBar'
import type { XAccount } from '@/types/app'

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

  return (
    <div className="min-h-screen bg-manavi-bg">
      <NavBar
        rightSlot={
          <>
            <AccountSelector
              accounts={xAccounts}
              currentAccountId={currentAccount.id}
            />
            <span className="text-xs text-white/40 truncate max-w-[180px]">
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
