import type { SupabaseClient } from '@supabase/supabase-js'

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
}

export async function checkMonthlyQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaResult> {
  const limit = parseInt(process.env.MONTHLY_TOKEN_QUOTA ?? '0', 10)

  if (limit === 0) {
    return { allowed: true, used: 0, limit: 0 }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('input_tokens, output_tokens')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  if (error || !data) {
    return { allowed: true, used: 0, limit }
  }

  const used = data.reduce(
    (sum: number, row: { input_tokens: number; output_tokens: number }) =>
      sum + row.input_tokens + row.output_tokens,
    0
  )

  return { allowed: used < limit, used, limit }
}
