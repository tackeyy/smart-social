import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { deleteTweet } from '@/lib/x/client'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tweetId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  try {
    const result = await deleteTweet(tweetId)

    // 対応するドラフトの posted_tweet_id をクリアして pending に戻す（ベストエフォート）
    await supabase
      .from('drafts')
      .update({ status: 'pending', posted_tweet_id: null, posted_at: null })
      .eq('posted_tweet_id', tweetId)
      .eq('user_id', user.id)
      .select()
      .single()

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete tweet'
    console.error('[x/tweet/[id]] delete error:', { tweetId, error: err })
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
