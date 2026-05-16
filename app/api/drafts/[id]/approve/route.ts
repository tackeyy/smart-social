import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { postTweet } from '@/lib/x/client'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // reply_drafts は x_account_id 経由でユーザーに紐づくため、
  // ユーザーが所有する x_account_ids を先に取得して所有権を確認する
  const { data: accounts } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('user_id', user.id)

  const accountIds = accounts?.map(a => a.id) ?? []

  // H-1: アトミックに pending → processing へ遷移（レースコンディション防止）
  // pending 以外の行は更新されないため、複数リクエストが同時に来ても1つだけが処理される
  const { data: claimed, error: claimError } = await supabase
    .from('reply_drafts')
    .update({ status: 'processing' })
    .eq('id', id)
    .eq('status', 'pending')
    .in('x_account_id', accountIds)
    .select()
    .single()

  if (claimError?.code === 'PGRST116' || !claimed) {
    // pending でない（posted / processing / rejected）か、存在しないか、権限なし
    // どの状態かを確認するため、現状を取得する
    const { data: existing, error: fetchError } = await supabase
      .from('reply_drafts')
      .select('id, status')
      .eq('id', id)
      .in('x_account_id', accountIds)
      .single()

    if (fetchError?.code === 'PGRST116' || !existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    if (fetchError) {
      // M-1: fetchError.message を外部に露出しない
      console.error('DB fetch error:', { draftId: id, error: fetchError })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (existing.status === 'posted') {
      return NextResponse.json({ error: 'Already posted' }, { status: 409 })
    }

    // processing / rejected など
    return NextResponse.json({ error: 'Already processing or not in pending state' }, { status: 409 })
  }

  if (claimError) {
    console.error('DB claim error:', { draftId: id, error: claimError })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  try {
    const tweet = await postTweet({ text: claimed.content })

    const { data: updated, error: updateError } = await supabase
      .from('reply_drafts')
      .update({ status: 'posted', posted_tweet_id: tweet.id, posted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      // ツイートは投稿済みなので DB との不整合をログに記録して警告付きで返す
      console.error('Tweet posted but DB update failed', {
        tweetId: tweet.id,
        draftId: id,
        error: updateError,
      })
      return NextResponse.json(
        { ...claimed, status: 'posted', posted_tweet_id: tweet.id, warning: 'DB sync failed' },
        { status: 200 }
      )
    }

    return NextResponse.json(updated ?? { ...claimed, status: 'posted', posted_tweet_id: tweet.id })
  } catch (err) {
    // X API 失敗: processing → pending に戻してリトライ可能にする
    await supabase
      .from('reply_drafts')
      .update({ status: 'pending' })
      .eq('id', id)

    const message = err instanceof Error ? err.message : 'Failed to post tweet'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
