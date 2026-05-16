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

  const { data: draft, error: fetchError } = await supabase
    .from('drafts')
    .select('*')
    .eq('id', id)
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

    const { data: updated } = await supabase
      .from('drafts')
      .update({ status: 'posted', posted_tweet_id: tweet.id, posted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json(updated ?? { ...draft, status: 'posted', posted_tweet_id: tweet.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to post tweet'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
