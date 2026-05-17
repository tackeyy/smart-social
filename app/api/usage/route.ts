import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface UsageRow {
  endpoint: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: string | number
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // 例: "2026-05"

  let startDate: Date
  let month: string

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    startDate = new Date(y, m - 1, 1)
    month = monthParam
  } else {
    const now = new Date()
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)

  const query = supabase
    .from('ai_usage_logs')
    .select('endpoint, model, input_tokens, output_tokens, cost_usd')
    .eq('user_id', user.id)
    .gte('created_at', startDate.toISOString())

  // month 指定時のみ上限を設定
  const { data, error } = monthParam
    ? await query.lt('created_at', endDate.toISOString())
    : await query

  if (error || !data) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }

  const rows = data as UsageRow[]
  const total_input_tokens = rows.reduce((s, r) => s + r.input_tokens, 0)
  const total_output_tokens = rows.reduce((s, r) => s + r.output_tokens, 0)
  const total_cost_usd = rows.reduce((s, r) => s + Number(r.cost_usd), 0)

  // endpoint 別集計
  const endpointMap = new Map<string, { calls: number; input_tokens: number; output_tokens: number; cost_usd: number }>()
  for (const r of rows) {
    const cur = endpointMap.get(r.endpoint) ?? { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }
    endpointMap.set(r.endpoint, {
      calls: cur.calls + 1,
      input_tokens: cur.input_tokens + r.input_tokens,
      output_tokens: cur.output_tokens + r.output_tokens,
      cost_usd: cur.cost_usd + Number(r.cost_usd),
    })
  }
  const by_endpoint = Array.from(endpointMap.entries()).map(([endpoint, stats]) => ({
    endpoint,
    ...stats,
  }))

  const quota_limit = parseInt(process.env.MONTHLY_TOKEN_QUOTA ?? '0', 10)
  const total_tokens = total_input_tokens + total_output_tokens
  const quota_used_pct = quota_limit > 0 ? Math.round((total_tokens / quota_limit) * 10000) / 100 : null

  return NextResponse.json({
    month,
    total_input_tokens,
    total_output_tokens,
    total_cost_usd: Math.round(total_cost_usd * 1e8) / 1e8,
    quota_limit,
    quota_used_pct,
    by_endpoint,
  })
}
