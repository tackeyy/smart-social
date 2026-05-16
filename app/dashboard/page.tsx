import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerateProfileButton } from '@/components/GenerateProfileButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/smart-social/auth/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [{ count: scheduledToday }, { count: pendingDrafts }] = await Promise.all([
    supabase
      .from('scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString()),
    supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <GenerateProfileButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              本日のスケジュール投稿
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{scheduledToday ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              承認待ちドラフト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{pendingDrafts ?? 0}</p>
              {(pendingDrafts ?? 0) > 0 && (
                <Badge variant="secondary">要対応</Badge>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">件</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/smart-social/dashboard/drafts"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all"
        >
          <h2 className="font-semibold mb-1">ドラフト管理</h2>
          <p className="text-sm text-gray-500">AIが生成した投稿候補を確認・承認・編集します</p>
        </Link>

        <Link
          href="/smart-social/dashboard/schedule"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all"
        >
          <h2 className="font-semibold mb-1">スケジュール管理</h2>
          <p className="text-sm text-gray-500">投稿のスケジュールを確認・作成・削除します</p>
        </Link>
      </div>
    </div>
  )
}
