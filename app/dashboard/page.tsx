import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerateProfileButton } from '@/components/GenerateProfileButton'
import { MonitoringSection } from '@/components/MonitoringSection'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const [{ count: scheduledToday }, { count: pendingDrafts }, { data: recentPosted }] = await Promise.all([
    supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .in('type', ['original', 'thread'])
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString()),
    supabase
      .from('drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('drafts')
      .select('id, content, posted_at, posted_tweet_id, status')
      .eq('status', 'posted')
      .eq('user_id', user!.id)
      .gte('posted_at', twoHoursAgo.toISOString())
      .order('posted_at', { ascending: false })
      .limit(5),
  ])

  const hasPending = (pendingDrafts ?? 0) > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">
            ダッシュボード
          </h1>
          <p className="text-sm text-manavi-navy-light mt-0.5">
            投稿の状況を確認します
          </p>
        </div>
        <GenerateProfileButton />
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">
              本日のスケジュール投稿
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold tabular-nums text-manavi-navy">
              {scheduledToday ?? 0}
            </p>
            <p className="text-xs text-manavi-muted mt-1">件</p>
          </CardContent>
        </Card>

        <Card className="shadow-manavi-sm rounded-[6px] border-manavi-border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">
              承認待ちドラフト
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-center gap-2">
              <p className="text-3xl font-semibold tabular-nums text-manavi-navy">
                {pendingDrafts ?? 0}
              </p>
              {hasPending && (
                <Badge className="bg-manavi-bg-accent text-manavi-primary border border-manavi-primary/20 text-xs rounded-[4px] px-1.5 py-0.5">
                  要対応
                </Badge>
              )}
            </div>
            <p className="text-xs text-manavi-muted mt-1">件</p>
          </CardContent>
        </Card>
      </div>

      {/* 初動モニタリング */}
      {(recentPosted ?? []).length > 0 && (
        <div className="mb-6">
          <MonitoringSection initialDrafts={recentPosted ?? []} />
        </div>
      )}

      {/* ナビゲーションカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/drafts"
          className="block p-5 bg-white border border-manavi-border rounded-[6px] shadow-manavi-sm hover:border-manavi-primary hover:shadow-manavi-md transition-all duration-150 group"
        >
          <h2 className="text-sm font-semibold text-manavi-navy mb-1 group-hover:text-manavi-primary transition-colors duration-150">
            ドラフト管理
          </h2>
          <p className="text-xs text-manavi-navy-light">
            AIが生成した投稿候補を確認・承認・編集します
          </p>
        </Link>

        <Link
          href="/dashboard/schedule"
          className="block p-5 bg-white border border-manavi-border rounded-[6px] shadow-manavi-sm hover:border-manavi-primary hover:shadow-manavi-md transition-all duration-150 group"
        >
          <h2 className="text-sm font-semibold text-manavi-navy mb-1 group-hover:text-manavi-primary transition-colors duration-150">
            スケジュール管理
          </h2>
          <p className="text-xs text-manavi-navy-light">
            投稿のスケジュールを確認・作成・削除します
          </p>
        </Link>
      </div>
    </div>
  )
}
