import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProfileSection } from '@/components/profile/ProfileSection'
import type { XAccount } from '@/types/app'
import type { StyleProfile } from '@/lib/claude/client'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ account_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = user
    ? await supabase
        .from('x_accounts')
        .select('id, user_id, x_user_id, screen_name, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  const xAccounts = (accounts ?? []) as XAccount[]

  const parsedId = params.account_id ? parseInt(params.account_id, 10) : null
  const validSelectedId = parsedId !== null && !Number.isNaN(parsedId) ? parsedId : null
  const currentAccount =
    (validSelectedId ? xAccounts.find((a) => a.id === validSelectedId) : null) ?? xAccounts[0]

  const { data: profileRow } = currentAccount
    ? await supabase
        .from('style_profiles')
        .select('profile_data, analyzed_at')
        .eq('x_account_id', currentAccount.id)
        .single()
    : { data: null }

  const profile = profileRow?.profile_data as StyleProfile | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground mt-1">アカウント連携と各種設定を管理します。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Xアカウント連携</CardTitle>
          <CardDescription>
            Xアカウントを連携すると、ダッシュボードからポストを管理できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {xAccounts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">連携中のアカウント</p>
              <ul className="space-y-2">
                {xAccounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">@{account.screen_name}</span>
                      <span className="text-xs text-muted-foreground">ID: {account.x_user_id}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">連携中のアカウントはありません。</p>
          )}

          <Button asChild>
            <Link href="/api/auth/x/initiate">
              Xアカウントを連携する
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>チーム管理</CardTitle>
          <CardDescription>
            チームを作成してメンバーと協力して投稿を管理します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/team">
              チーム管理を開く
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>エバーグリーン再投稿</CardTitle>
          <CardDescription>
            高エンゲージメントの投稿を定期的に自動再投稿します。分析ページから登録できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/evergreen">
              エバーグリーン管理を開く
            </Link>
          </Button>
        </CardContent>
      </Card>

      {currentAccount && (
        <ProfileSection
          xAccountId={currentAccount.id}
          initialProfile={profile}
          analyzedAt={profileRow?.analyzed_at ?? null}
        />
      )}
    </div>
  )
}
