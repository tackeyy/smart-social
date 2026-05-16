import { selectPrefix, buildRepostContent } from './prefixes'

export interface EvergreenRule {
  id: string
  user_id: string
  x_account_id: number
  source_tweet_id: string
  source_content: string
  prefix_pool: string[]
  interval_days: number
  max_runs: number | null
  run_count: number
  last_run_at: string | null
  next_run_at: string | null
  enabled: boolean
}

export function buildEvergreenDraft(
  rule: Pick<EvergreenRule, 'user_id' | 'x_account_id' | 'source_content'>,
  prefix: string
): {
  user_id: string
  x_account_id: number
  content: string
  type: 'original'
  status: 'scheduled'
  scheduled_at: string
} {
  return {
    user_id: rule.user_id,
    x_account_id: rule.x_account_id,
    content: buildRepostContent(prefix, rule.source_content),
    type: 'original',
    status: 'scheduled',
    scheduled_at: new Date().toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runEvergreen(supabase: any): Promise<Array<{ rule_id: string; status: string }>> {
  const now = new Date().toISOString()

  // アトミックに enabled=true && next_run_at <= now のルールを取得
  const { data: rules, error: fetchError } = await supabase
    .from('evergreen_rules')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now)

  if (fetchError) throw fetchError
  if (!rules || rules.length === 0) return []

  const results: Array<{ rule_id: string; status: string }> = []

  for (const rule of rules as EvergreenRule[]) {
    try {
      // max_runs チェック
      if (rule.max_runs !== null && rule.run_count >= rule.max_runs) {
        // 上限到達 → 無効化
        await supabase
          .from('evergreen_rules')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', rule.id)
        results.push({ rule_id: rule.id, status: 'max_runs_reached' })
        continue
      }

      const prefix = selectPrefix(
        Array.isArray(rule.prefix_pool) ? rule.prefix_pool : [],
        null  // 最後に使ったprefixはDB未保存のためnull
      )
      const draft = buildEvergreenDraft(rule, prefix)

      const { error: insertError } = await supabase
        .from('drafts')
        .insert(draft)

      if (insertError) throw insertError

      // next_run_at を更新
      const nextRunAt = new Date(
        Date.now() + rule.interval_days * 24 * 60 * 60 * 1000
      ).toISOString()

      await supabase
        .from('evergreen_rules')
        .update({
          run_count: rule.run_count + 1,
          last_run_at: now,
          next_run_at: nextRunAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id)

      results.push({ rule_id: rule.id, status: 'drafted' })
    } catch (err) {
      console.error('[evergreen] rule execution error:', { ruleId: rule.id, error: err })
      results.push({ rule_id: rule.id, status: 'error' })
    }
  }

  return results
}
