import type { SupabaseClient } from '@supabase/supabase-js'
import { calcCostUsd } from './pricing'

export type AiEndpoint = 'drafts_generate' | 'profile_generate' | 'precheck'
export type AiModel = 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001'

export interface UsageParams {
  endpoint: AiEndpoint
  model: AiModel
  input_tokens: number
  output_tokens: number
}

export async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  params: UsageParams
): Promise<void> {
  const cost_usd = calcCostUsd(params.model, params.input_tokens, params.output_tokens)
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    endpoint: params.endpoint,
    model: params.model,
    input_tokens: params.input_tokens,
    output_tokens: params.output_tokens,
    cost_usd,
  })
  if (error) {
    console.error('[logUsage] failed to insert ai_usage_logs', error)
  }
}
