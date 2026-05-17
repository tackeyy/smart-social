import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface UsageRow {
  endpoint: string
  input_tokens: number
  output_tokens: number
  cost_usd: string | number
}

interface EndpointStat {
  endpoint: string
  calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

const ENDPOINT_LABELS: Record<string, string> = {
  drafts_generate: '返信生成',
  profile_generate: 'プロファイル生成',
  precheck: '事前チェック',
}

export default async function UsagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: rows } = await supabase
    .from('ai_usage_logs')
    .select('endpoint, input_tokens, output_tokens, cost_usd')
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  const usageRows = (rows ?? []) as UsageRow[]

  const total_input_tokens = usageRows.reduce((s, r) => s + r.input_tokens, 0)
  const total_output_tokens = usageRows.reduce((s, r) => s + r.output_tokens, 0)
  const total_cost_usd = usageRows.reduce((s, r) => s + Number(r.cost_usd), 0)
  const totalTokens = total_input_tokens + total_output_tokens

  const endpointMap = new Map<string, EndpointStat>()
  for (const r of usageRows) {
    const cur = endpointMap.get(r.endpoint) ?? { endpoint: r.endpoint, calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }
    endpointMap.set(r.endpoint, {
      ...cur,
      calls: cur.calls + 1,
      input_tokens: cur.input_tokens + r.input_tokens,
      output_tokens: cur.output_tokens + r.output_tokens,
      cost_usd: cur.cost_usd + Number(r.cost_usd),
    })
  }
  const by_endpoint = Array.from(endpointMap.values())

  const quotaLimit = parseInt(process.env.MONTHLY_TOKEN_QUOTA ?? '0', 10)
  const quotaPct = quotaLimit > 0 ? Math.round((totalTokens / quotaLimit) * 10000) / 100 : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-manavi-navy">AI使用量</h1>
        <p className="text-manavi-muted text-sm mt-1">{month} の使用状況</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-manavi-sm border-manavi-border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">合計トークン</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold tabular-nums text-manavi-navy">
              {totalTokens.toLocaleString()}
            </p>
            <p className="text-xs text-manavi-muted mt-1">
              入力: {total_input_tokens.toLocaleString()} / 出力: {total_output_tokens.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-manavi-sm border-manavi-border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">推定コスト</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold tabular-nums text-manavi-navy">
              ${total_cost_usd.toFixed(4)}
            </p>
            <p className="text-xs text-manavi-muted mt-1">USD（今月累計）</p>
          </CardContent>
        </Card>

        <Card className="shadow-manavi-sm border-manavi-border">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-medium text-manavi-navy-light uppercase tracking-wide">クォータ使用率</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {quotaLimit > 0 ? (
              <>
                <p className="text-3xl font-semibold tabular-nums text-manavi-navy">{quotaPct?.toFixed(1)}%</p>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-manavi-primary transition-all"
                    style={{ width: `${Math.min(quotaPct ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-manavi-muted mt-1">
                  {totalTokens.toLocaleString()} / {quotaLimit.toLocaleString()} tokens
                </p>
              </>
            ) : (
              <p className="text-sm text-manavi-muted">上限なし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* endpoint 別内訳 */}
      <Card className="shadow-manavi-sm border-manavi-border">
        <CardHeader>
          <CardTitle className="text-manavi-navy text-base">機能別内訳</CardTitle>
        </CardHeader>
        <CardContent>
          {by_endpoint.length === 0 ? (
            <p className="text-manavi-muted text-sm">今月の使用記録はありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-manavi-border text-manavi-muted">
                    <th className="text-left py-2 pr-4">機能</th>
                    <th className="text-right py-2 pr-4">回数</th>
                    <th className="text-right py-2 pr-4">入力tokens</th>
                    <th className="text-right py-2 pr-4">出力tokens</th>
                    <th className="text-right py-2">コスト(USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {by_endpoint.map((row) => (
                    <tr key={row.endpoint} className="border-b border-manavi-border text-manavi-navy">
                      <td className="py-2 pr-4">{ENDPOINT_LABELS[row.endpoint] ?? row.endpoint}</td>
                      <td className="text-right py-2 pr-4">{row.calls}</td>
                      <td className="text-right py-2 pr-4">{row.input_tokens.toLocaleString()}</td>
                      <td className="text-right py-2 pr-4">{row.output_tokens.toLocaleString()}</td>
                      <td className="text-right py-2">${row.cost_usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
