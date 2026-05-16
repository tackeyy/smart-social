import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { postThread } from '@/lib/x/client'

const MIN_TWEETS = 2
const MAX_TWEETS = 10

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { x_account_id: number; tweets: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { x_account_id, tweets } = body

  if (!x_account_id || typeof x_account_id !== 'number') {
    return NextResponse.json({ error: 'x_account_id is required' }, { status: 400 })
  }

  if (!Array.isArray(tweets) || tweets.length < MIN_TWEETS || tweets.length > MAX_TWEETS) {
    return NextResponse.json(
      { error: `tweets must be an array of ${MIN_TWEETS}–${MAX_TWEETS} items` },
      { status: 400 }
    )
  }

  // x_account_id がログインユーザーのものか確認
  const { data: account } = await supabase
    .from('x_accounts')
    .select('id')
    .eq('id', x_account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { tweet_ids } = await postThread({ tweets })

    // 最初のツイートをdraftsテーブルにstatus='posted'で保存
    const { error: insertError } = await supabase.from('drafts').insert({
      user_id: user.id,
      x_account_id,
      content: tweets[0],
      status: 'posted',
      posted_at: new Date().toISOString(),
    })

    if (insertError) {
      // ツイートは投稿済みなので DB 保存失敗をログに記録して警告付きで返す
      console.error('Thread posted but draft DB insert failed', {
        tweet_ids,
        error: insertError,
      })
      return NextResponse.json({ tweet_ids, warning: 'DB sync failed' }, { status: 200 })
    }

    return NextResponse.json({ tweet_ids }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to post thread'
    console.error('Thread post failed:', { userId: user.id, x_account_id, error: err })
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
