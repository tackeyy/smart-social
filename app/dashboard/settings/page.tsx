import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GenerateProfileButton } from '@/components/GenerateProfileButton'
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

  const selectedId = params.account_id ? parseInt(params.account_id, 10) : null
  const currentAccount =
    (selectedId ? xAccounts.find((a) => a.id === selectedId) : null) ?? xAccounts[0]

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>文体プロファイル</CardTitle>
              <CardDescription className="mt-1">
                過去のツイートから自動生成された文体の特徴です。AI返信案の生成に使用されます。
              </CardDescription>
            </div>
            {currentAccount && <GenerateProfileButton xAccountId={currentAccount.id} />}
          </div>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-4 text-sm">
              {profileRow?.analyzed_at && (
                <p className="text-xs text-muted-foreground">
                  最終更新: {new Date(profileRow.analyzed_at).toLocaleString('ja-JP')}
                </p>
              )}
              <div className="grid gap-3">
                <div className="rounded-md border border-border px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">トーン</p>
                  <p>{profile.tone}</p>
                </div>
                {profile.emoji_usage && (
                  <div className="rounded-md border border-border px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">絵文字の使い方</p>
                    <p>{profile.emoji_usage}</p>
                  </div>
                )}
                {profile.avg_length !== undefined && (
                  <div className="rounded-md border border-border px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">平均文字数</p>
                    <p>{profile.avg_length} 文字</p>
                  </div>
                )}
                {profile.patterns && profile.patterns.length > 0 && (
                  <div className="rounded-md border border-border px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">文体パターン</p>
                    <ul className="space-y-1">
                      {profile.patterns.map((p, i) => (
                        <li key={i} className="text-sm">・{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.sample_phrases && profile.sample_phrases.length > 0 && (
                  <div className="rounded-md border border-border px-4 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">よく使うフレーズ</p>
                    <ul className="space-y-1">
                      {profile.sample_phrases.map((p, i) => (
                        <li key={i} className="text-sm text-muted-foreground">「{p}」</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              まだ文体プロファイルが生成されていません。右上のボタンから生成してください。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
