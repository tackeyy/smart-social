import type { TweetMetrics } from '@/lib/x/analytics'

export interface HourlyScore {
  hour: number      // 0-23 (JST)
  avg_score: number
  count: number
}

export function analyzeOptimalPostingTimes(metrics: TweetMetrics[]): HourlyScore[] {
  if (metrics.length === 0) return []

  const byHour: Record<number, number[]> = {}

  for (const m of metrics) {
    const date = new Date(m.created_at)
    // UTC → JST (+9時間)
    const jstHour = (date.getUTCHours() + 9) % 24
    if (!byHour[jstHour]) byHour[jstHour] = []
    byHour[jstHour].push(m.engagement_score)
  }

  return Object.entries(byHour)
    .map(([hour, scores]) => ({
      hour: Number(hour),
      avg_score: scores.reduce((s, v) => s + v, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 5)
}
