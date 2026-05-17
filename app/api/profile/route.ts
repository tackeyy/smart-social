import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { StyleProfile } from '@/lib/claude/client'

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: {
    x_account_id?: unknown
    tone?: unknown
    emoji_usage?: unknown
    avg_length?: unknown
    patterns?: unknown
    sample_phrases?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.x_account_id) {
    return NextResponse.json({ error: 'アカウントIDは必須です' }, { status: 400 })
  }

  if (!body.tone || typeof body.tone !== 'string' || body.tone.trim() === '') {
    return NextResponse.json({ error: 'toneは必須です' }, { status: 400 })
  }

  if (body.tone.length > 500) {
    return NextResponse.json({ error: 'toneは500文字以内で指定してください' }, { status: 400 })
  }

  if (body.avg_length !== undefined) {
    if (!Number.isInteger(body.avg_length) || (body.avg_length as number) < 0) {
      return NextResponse.json({ error: 'avg_lengthは0以上の整数で指定してください' }, { status: 400 })
    }
  }

  if (body.patterns !== undefined) {
    if (!Array.isArray(body.patterns) || body.patterns.some((p: unknown) => typeof p !== 'string')) {
      return NextResponse.json({ error: 'patternsは文字列の配列で指定してください' }, { status: 400 })
    }
  }

  if (body.sample_phrases !== undefined) {
    if (!Array.isArray(body.sample_phrases) || body.sample_phrases.some((p: unknown) => typeof p !== 'string')) {
      return NextResponse.json({ error: 'sample_phrasesは文字列の配列で指定してください' }, { status: 400 })
    }
  }

  // x_account_id の所有権確認
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id, user_id')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Xアカウントが見つからないか、アクセス権限がありません' }, { status: 403 })
  }

  // profile_data の更新フィールドを構築
  const profileUpdate: Partial<StyleProfile> = {
    tone: body.tone,
  }
  if (body.emoji_usage !== undefined) {
    profileUpdate.emoji_usage = body.emoji_usage as string
  }
  if (body.avg_length !== undefined) {
    profileUpdate.avg_length = body.avg_length as number
  }
  if (body.patterns !== undefined) {
    profileUpdate.patterns = body.patterns as string[]
  }
  if (body.sample_phrases !== undefined) {
    profileUpdate.sample_phrases = body.sample_phrases as string[]
  }

  // style_profiles の profile_data を更新（analyzed_at・model_version は更新しない）
  const { data: updated, error: updateError } = await supabase
    .from('style_profiles')
    .update({ profile_data: profileUpdate })
    .eq('x_account_id', body.x_account_id)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'プロファイルが見つかりません。先にプロファイルを生成してください' }, { status: 404 })
    }
    console.error('[profile] update error:', updateError)
    return NextResponse.json({ error: 'プロファイルの更新に失敗しました: ' + updateError.message }, { status: 500 })
  }

  return NextResponse.json({ profile: updated.profile_data }, { status: 200 })
}
