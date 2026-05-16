import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateDraftCandidates } from '@/lib/claude/client'
import { checkRateLimit } from '@/lib/rate-limit'

const DRAFTS_GENERATE_COOLDOWN_MS = 30 * 1000

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: {
    x_account_id?: string
    source_tweet_url?: string
    source_tweet_text?: string
    instruction?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (!body.x_account_id || !body.source_tweet_url) {
    return NextResponse.json({ error: 'アカウントIDとツイートURLは必須です' }, { status: 400 })
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

  const { allowed, remainingSec } = checkRateLimit(
    `${user.id}:drafts:generate`,
    DRAFTS_GENERATE_COOLDOWN_MS
  )
  if (!allowed) {
    return NextResponse.json(
      { error: `リクエストが多すぎます。${remainingSec} 秒後に再試行してください` },
      { status: 429 }
    )
  }

  // style_profiles から最新プロファイル取得
  const { data: styleProfile, error: profileError } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('x_account_id', body.x_account_id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profileError || !styleProfile) {
    return NextResponse.json(
      { error: 'プロファイルが見つかりません。先にプロファイルを生成してください。' },
      { status: 404 }
    )
  }

  // lib/claude/client.ts の関数で3候補生成
  try {
    const { tone, emoji_usage, avg_length, patterns, sample_phrases } = styleProfile.profile_data ?? styleProfile
    const candidates = await generateDraftCandidates(
      body.source_tweet_text ?? body.source_tweet_url,
      { tone, emoji_usage, avg_length, patterns, sample_phrases },
      body.instruction
    )

    // 3候補を ai_candidates JSONB 配列に格納し、1レコードで管理（旧: 3レコードに分割）
    const sourceTweetIdMatch = body.source_tweet_url?.match(/\/status\/(\d{1,20})(?:[?#].*)?$/)
    const source_tweet_id = sourceTweetIdMatch?.[1] ?? ''
    const now = new Date().toISOString()
    const { data: insertedDraft, error: insertError } = await supabase
      .from('drafts')
      .insert({
        user_id: user.id,
        x_account_id: body.x_account_id,
        type: 'reply',
        content: candidates[0],  // デフォルトは候補0番
        source_tweet_id,
        source_tweet_text: body.source_tweet_text ?? body.source_tweet_url,
        ai_candidates: candidates.map((text: string) => ({
          text,
          generated_by: 'claude-sonnet-4-6',
          created_at: now,
        })),
        selected_index: 0,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // レスポンスは配列形式を維持して後方互換性を保つ
    return NextResponse.json({ drafts: insertedDraft ? [insertedDraft] : [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate drafts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
