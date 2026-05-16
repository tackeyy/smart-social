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

  const { data: draft, error: fetchError } = await supabase
    .from('reply_drafts')
    .select('*')
    .eq('id', id)
    .in('x_account_id', accountIds)  // 所有権確認
    .single()

  if (fetchError?.code === 'PGRST116' || !draft) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (draft.status === 'posted') {
    return NextResponse.json({ error: 'Already posted' }, { status: 409 })
  }

  try {
    const tweet = await postTweet({ text: draft.content })

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
        { ...draft, status: 'posted', posted_tweet_id: tweet.id, warning: 'DB sync failed' },
        { status: 200 }
      )
    }

    return NextResponse.json(updated ?? { ...draft, status: 'posted', posted_tweet_id: tweet.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to post tweet'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
