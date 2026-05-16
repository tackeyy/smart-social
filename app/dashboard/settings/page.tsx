import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { XAccount } from '@/types/app'

export default async function SettingsPage() {
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
    </div>
  )
}
