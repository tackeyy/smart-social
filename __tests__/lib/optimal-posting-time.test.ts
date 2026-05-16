import { describe, it, expect } from 'vitest'
import { analyzeOptimalPostingTimes } from '@/lib/analytics/optimal-posting-time'
import type { TweetMetrics } from '@/lib/x/analytics'

function makeTweet(hour: number, score: number): TweetMetrics {
  const d = new Date(2024, 0, 15, hour, 0, 0) // JST を想定（固定日）
  return {
    tweet_id: `${hour}-${score}`,
    text: 'test',
    created_at: d.toISOString(),
    like_count: 0,
    retweet_count: 0,
    reply_count: 0,
    quote_count: 0,
    impression_count: 100,
    engagement_rate: 0,
    engagement_score: score,
  }
}

describe('analyzeOptimalPostingTimes', () => {
  it('空の配列は空の結果を返す', () => {
    const result = analyzeOptimalPostingTimes([])
    expect(result).toEqual([])
  })

  it('スコアが高い時間帯を上位に返す', () => {
    const metrics: TweetMetrics[] = [
      makeTweet(8, 100),   // 8時: スコア100
      makeTweet(8, 200),   // 8時: スコア200 → 平均150
      makeTweet(20, 300),  // 20時: スコア300
      makeTweet(20, 100),  // 20時: スコア100 → 平均200
      makeTweet(12, 50),   // 12時: スコア50
    ]
    const result = analyzeOptimalPostingTimes(metrics)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].hour).toBe(20) // 平均スコアが最も高い時間帯
    expect(result[0].avg_score).toBeCloseTo(200)
  })

  it('最大5件まで返す', () => {
    const metrics: TweetMetrics[] = Array.from({ length: 20 }, (_, i) =>
      makeTweet(i % 24, Math.random() * 100)
    )
    const result = analyzeOptimalPostingTimes(metrics)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('各時間帯のツイート件数が含まれる', () => {
    const metrics: TweetMetrics[] = [
      makeTweet(9, 100),
      makeTweet(9, 200),
      makeTweet(9, 150),
    ]
    const result = analyzeOptimalPostingTimes(metrics)
    const hour9 = result.find(r => r.hour === 9)
    expect(hour9?.count).toBe(3)
    expect(hour9?.avg_score).toBeCloseTo(150)
  })
})
