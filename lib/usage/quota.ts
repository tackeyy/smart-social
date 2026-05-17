import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/types/subscription'
import { getMonthlyAiLimit } from '@/lib/subscription'

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

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

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

export async function checkAiGenerationQuota(
  supabase: SupabaseClient,
  userId: string,
  plan: Plan
): Promise<QuotaResult> {
  const limit = getMonthlyAiLimit(plan)
  if (!isFinite(limit)) return { allowed: true, used: 0, limit: Infinity }

  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', 'drafts_generate')
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('[checkAiGenerationQuota] query error:', error)
    return { allowed: false, used: 0, limit }
  }

  const used = count ?? 0
  return { allowed: used < limit, used, limit }
}
