import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateDraftCandidates } from '@/lib/claude/client'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.x_account_id || !body.source_tweet_url) {
    return NextResponse.json({ error: 'x_account_id and source_tweet_url are required' }, { status: 400 })
  }

  // x_account_id の所有権確認
  const { data: account, error: accountError } = await supabase
    .from('x_accounts')
    .select('id, user_id')
    .eq('id', body.x_account_id)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'X account not found or access denied' }, { status: 403 })
  }

  // style_profiles から最新プロファイル取得
  const { data: styleProfile, error: profileError } = await supabase
    .from('style_profiles')
    .select('*')
    .eq('x_account_id', body.x_account_id)
    .single()

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

    // reply_drafts に INSERT
    const now = new Date().toISOString()
    const { data: insertedDrafts, error: insertError } = await supabase
      .from('reply_drafts')
      .insert(
        candidates.map((text: string) => ({
          x_account_id: body.x_account_id,
          source_tweet_url: body.source_tweet_url,
          source_tweet_text: body.source_tweet_text,
          content: text,
          status: 'pending',
          draft_candidates: [
            {
              text,
              generated_by: 'claude-sonnet-4-6',
              created_at: now,
            },
          ],
        }))
      )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ drafts: insertedDrafts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate drafts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
