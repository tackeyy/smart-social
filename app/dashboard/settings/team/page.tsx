'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import type { Team, TeamMember, TeamRole } from '@/types/app'

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
}

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<TeamRole | null>(null)
  const [loading, setLoading] = useState(true)

  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const [deletingMember, setDeletingMember] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  const fetchCurrentUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      return user.id
    }
    return null
  }, [])

  const fetchTeam = useCallback(async () => {
    const res = await fetch('/smart-social/api/teams')
    if (!res.ok) return null
    const teams = await res.json() as Team[]
    return teams[0] ?? null
  }, [])

  const fetchMembers = useCallback(async (teamId: string) => {
    const res = await fetch(`/smart-social/api/teams/${teamId}/members`)
    if (!res.ok) return []
    return (await res.json()) as TeamMember[]
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uid, t] = await Promise.all([fetchCurrentUser(), fetchTeam()])
      setTeam(t)
      if (t && uid) {
        const ms = await fetchMembers(t.id)
        setMembers(ms)
        const me = ms.find((m) => m.user_id === uid)
        setCurrentRole(me?.role ?? null)
      }
    } finally {
      setLoading(false)
    }
  }, [fetchCurrentUser, fetchTeam, fetchMembers])

  useEffect(() => { void load() }, [load])

  async function handleCreateTeam(e: React.SyntheticEvent<HTMLFormElement><HTMLFormElement>) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch('/smart-social/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '作成失敗')
      }
      toast.success('チームを作成しました')
      setCreateName('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveName(e: React.SyntheticEvent<HTMLFormElement><HTMLFormElement>) {
    e.preventDefault()
    if (!team) return
    const name = editName.trim()
    if (!name) return
    setSavingName(true)
    try {
      const res = await fetch(`/smart-social/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '更新失敗')
      }
      toast.success('チーム名を更新しました')
      setEditingName(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSavingName(false)
    }
  }

  async function handleInvite(e: React.SyntheticEvent<HTMLFormElement><HTMLFormElement>) {
    e.preventDefault()
    if (!team) return
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    try {
      const res = await fetch(`/smart-social/api/teams/${team.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '招待失敗')
      }
      toast.success('メンバーを招待しました')
      setInviteEmail('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(userId: string, role: TeamRole) {
    if (!team) return
    setChangingRole(userId)
    try {
      const res = await fetch(`/smart-social/api/teams/${team.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '更新失敗')
      }
      toast.success('役割を変更しました')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '役割変更に失敗しました')
    } finally {
      setChangingRole(null)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!team) return
    const isSelf = userId === currentUserId
    const msg = isSelf ? 'チームから退会しますか？' : 'このメンバーを除名しますか？'
    if (!confirm(msg)) return
    setDeletingMember(userId)
    try {
      const res = await fetch(`/smart-social/api/teams/${team.id}/members/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '削除失敗')
      }
      toast.success(isSelf ? '退会しました' : 'メンバーを除名しました')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作に失敗しました')
    } finally {
      setDeletingMember(null)
    }
  }

  async function handleDeleteTeam() {
    if (!team) return
    if (!confirm(`チーム「${team.name}」を削除しますか？この操作は元に戻せません。`)) return
    try {
      const res = await fetch(`/smart-social/api/teams/${team.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? '削除失敗')
      }
      toast.success('チームを削除しました')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const isOwner = currentRole === 'owner'

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-manavi-navy">チーム管理</h1>
        <p className="text-xs text-manavi-muted mt-0.5">
          チームを作成してメンバーと協力して投稿を管理できます
        </p>
      </div>

      {!team ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">チームを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="flex gap-2">
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="チーム名"
                maxLength={100}
                className="text-sm"
                required
                aria-label="チーム名"
              />
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? '作成中...' : '作成'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* チーム名 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">チーム名</CardTitle>
                {isOwner && !editingName && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditName(team.name); setEditingName(true) }}
                  >
                    編集
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={100}
                    className="text-sm"
                    required
                    aria-label="チーム名"
                    autoFocus
                  />
                  <Button type="submit" size="sm" disabled={savingName}>
                    {savingName ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingName(false)}
                  >
                    キャンセル
                  </Button>
                </form>
              ) : (
                <p className="text-sm font-medium text-manavi-navy">{team.name}</p>
              )}
            </CardContent>
          </Card>

          {/* メンバー一覧 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">メンバー一覧</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((member) => {
                const isSelf = member.user_id === currentUserId
                const isOnlyOwner = member.role === 'owner' && members.filter((m) => m.role === 'owner').length <= 1

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between rounded-md border border-manavi-border px-3 py-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                        <span className="text-xs text-manavi-muted font-mono">{member.user_id.slice(0, 8)}…</span>
                        {isSelf && <span className="text-xs text-manavi-muted">（あなた）</span>}
                      </div>
                      <p className="text-xs text-manavi-muted">
                        参加: {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>

                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!isSelf && (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.user_id, e.target.value as TeamRole)}
                            disabled={changingRole === member.user_id}
                            aria-label={`${member.user_id.slice(0, 8)} の役割`}
                            className="text-xs border border-manavi-border rounded-md px-1.5 py-1 text-manavi-navy bg-white disabled:opacity-50"
                          >
                            <option value="owner">オーナー</option>
                            <option value="admin">管理者</option>
                            <option value="member">メンバー</option>
                          </select>
                        )}
                        {isSelf && isOnlyOwner ? (
                          <span className="text-xs text-manavi-muted px-2">オーナーは残留必須です</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={deletingMember === member.user_id}
                          >
                            {isSelf ? '退会' : '除名'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* メンバー招待（ownerのみ） */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">メンバーを招待</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="メールアドレス"
                    className="text-sm"
                    required
                    aria-label="招待するメールアドレス"
                  />
                  <Button type="submit" size="sm" disabled={inviting}>
                    {inviting ? '招待中...' : '招待'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* チーム削除（ownerのみ） */}
          {isOwner && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm text-red-600">危険な操作</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-manavi-muted mb-3">
                  チームを削除すると全メンバーのアクセスが失われます。この操作は元に戻せません。
                </p>
                <Button variant="destructive" size="sm" onClick={handleDeleteTeam}>
                  チームを削除
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
