import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AccountSelector } from '@/components/AccountSelector'
import type { XAccount } from '@/types/app'

const navLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/dashboard/drafts', label: 'ドラフト' },
  { href: '/dashboard/schedule', label: 'スケジュール' },
  { href: '/dashboard/analytics', label: '分析' },
  { href: '/dashboard/accounts', label: 'アカウント' },
  { href: '/dashboard/settings', label: '設定' },
]

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
      <nav className="bg-manavi-navy border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-white font-semibold text-base tracking-[-0.01em] shrink-0"
              >
                Smart Social
              </Link>
              <div className="flex items-center gap-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded transition-colors duration-150"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AccountSelector
                accounts={xAccounts}
                currentAccountId={currentAccount.id}
              />
              <span className="text-xs text-white/40 truncate max-w-[180px]">
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
