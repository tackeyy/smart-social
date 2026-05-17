'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GenerateProfileButton } from '@/components/GenerateProfileButton'
import { TagInput } from '@/components/profile/TagInput'
import type { StyleProfile } from '@/lib/claude/client'

interface ProfileSectionProps {
  xAccountId: number
  initialProfile: StyleProfile | null
  analyzedAt: string | null
}

export function ProfileSection({ xAccountId, initialProfile, analyzedAt }: ProfileSectionProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [profile, setProfile] = useState<StyleProfile | null>(initialProfile)
  const [saving, setSaving] = useState(false)

  const [tone, setTone] = useState(profile?.tone ?? '')
  const [emojiUsage, setEmojiUsage] = useState(profile?.emoji_usage ?? '')
  const [avgLength, setAvgLength] = useState<number | ''>(profile?.avg_length ?? '')
  const [patterns, setPatterns] = useState<string[]>(profile?.patterns ?? [])
  const [samplePhrases, setSamplePhrases] = useState<string[]>(profile?.sample_phrases ?? [])

  function enterEdit() {
    setTone(profile?.tone ?? '')
    setEmojiUsage(profile?.emoji_usage ?? '')
    setAvgLength(profile?.avg_length ?? '')
    setPatterns(profile?.patterns ?? [])
    setSamplePhrases(profile?.sample_phrases ?? [])
    setMode('edit')
  }

  function cancelEdit() {
    setTone(profile?.tone ?? '')
    setEmojiUsage(profile?.emoji_usage ?? '')
    setAvgLength(profile?.avg_length ?? '')
    setPatterns(profile?.patterns ?? [])
    setSamplePhrases(profile?.sample_phrases ?? [])
    setMode('view')
  }

  async function handleSave() {
    if (!tone.trim()) {
      toast.error('トーンは必須です')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/smart-social/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_account_id: xAccountId,
          tone: tone.trim(),
          emoji_usage: emojiUsage || undefined,
          avg_length: avgLength !== '' ? Number(avgLength) : undefined,
          patterns: patterns.length > 0 ? patterns : undefined,
          sample_phrases: samplePhrases.length > 0 ? samplePhrases : undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? `エラーが発生しました (${res.status})`
        )
      }

      const updated = (data as { profile: StyleProfile }).profile
      setProfile(updated)
      setMode('view')
      toast.success('プロファイルを保存しました')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'プロファイルの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>文体プロファイル</CardTitle>
            <CardDescription className="mt-1">
              過去のツイートから自動生成された文体の特徴です。AI返信案の生成に使用されます。
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <GenerateProfileButton xAccountId={xAccountId} />
            {mode === 'view' && profile && (
              <Button variant="outline" onClick={enterEdit}>
                編集
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'view' ? (
          profile ? (
            <div className="space-y-4 text-sm">
              {analyzedAt && (
                <p className="text-xs text-muted-foreground">
                  最終更新: {new Date(analyzedAt).toLocaleString('ja-JP')}
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
          )
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-manavi-navy" htmlFor="profile-tone">
                トーン <span className="text-manavi-error">*</span>
              </label>
              <Textarea
                id="profile-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="例：フレンドリーで親しみやすいトーン"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-manavi-navy" htmlFor="profile-emoji">
                絵文字の使い方
              </label>
              <Textarea
                id="profile-emoji"
                value={emojiUsage}
                onChange={(e) => setEmojiUsage(e.target.value)}
                placeholder="例：ほとんど使わない"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-manavi-navy" htmlFor="profile-avg-length">
                平均文字数
              </label>
              <Input
                id="profile-avg-length"
                type="number"
                min={0}
                max={10000}
                step={1}
                value={avgLength}
                onChange={(e) => {
                  const v = e.target.value
                  setAvgLength(v === '' ? '' : Math.max(0, Math.floor(Number(v))))
                }}
                placeholder="例：120"
                className="w-40"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-manavi-navy">文体パターン</p>
              <TagInput
                tags={patterns}
                onChange={setPatterns}
                placeholder="パターンを入力してEnter"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-manavi-navy">よく使うフレーズ</p>
              <TagInput
                tags={samplePhrases}
                onChange={setSamplePhrases}
                placeholder="フレーズを入力してEnter"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
