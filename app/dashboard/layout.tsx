import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <span className="font-bold text-lg">Smart Social</span>
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
                下書き
              </Link>
              <Link
                href="/smart-social/dashboard/schedule"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                スケジュール
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
