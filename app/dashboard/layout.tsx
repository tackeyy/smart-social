import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/smart-social/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/smart-social/dashboard" className="font-bold text-lg">
                Smart Social
              </Link>
              <Link
                href="/smart-social/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ダッシュボード
              </Link>
              <Link
                href="/smart-social/dashboard/drafts"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ドラフト
              </Link>
              <Link
                href="/smart-social/dashboard/schedule"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                スケジュール
              </Link>
            </div>
            <div className="text-xs text-gray-400 truncate max-w-[200px]">
              {user.email}
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
