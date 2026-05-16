import { describe, it, expect, vi } from 'vitest'
import { buildEvergreenDraft, runEvergreen } from '@/lib/evergreen/scheduler'

// エバーグリーンルールの最小形
const makeRule = (overrides?: object) => ({
  id: 'rule-uuid-1',
  user_id: 'user-uuid-1',
  x_account_id: 42,
  source_content: 'エバーグリーンな投稿本文',
  ...overrides,
})

// EvergreenRule の完全な形（runEvergreen 用）
const makeFullRule = (overrides?: object) => ({
  id: 'rule-uuid-1',
  user_id: 'user-uuid-1',
  x_account_id: 42,
  source_tweet_id: 'tweet-001',
  source_content: 'エバーグリーンな投稿本文',
  prefix_pool: ['【再掲】', '【保存版】'],
  interval_days: 30,
  max_runs: null,
  run_count: 0,
  last_run_at: null,
  last_prefix: null,
  next_run_at: new Date(Date.now() - 1000).toISOString(), // 過去 = 対象
  enabled: true,
  ...overrides,
})

/**
 * Supabase クライアントのモック生成
 * - lte().select() でルール一覧を返す
 * - insert は insertResult（デフォルト成功）を返す
 * - update は楽観的ロック対応: .eq().eq().select().single() チェーンで updated を返す
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSupabase(rules: object[], options?: { insertError?: object | null; updateResult?: { data: object | null; error: object | null } }) {
  const insertError = options?.insertError ?? null
  const updateResult = options?.updateResult ?? { data: { id: 'rule-uuid-1' }, error: null }

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({ data: rules, error: null }),
  }
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(updateResult),
  }
  const insertChain = {
    insert: vi.fn().mockResolvedValue({ error: insertError }),
  }
  return {
    from: vi.fn((table: string) => {
      if (table === 'evergreen_rules') {
        return {
          select: vi.fn().mockReturnValue(selectChain),
          update: vi.fn().mockReturnValue(updateChain),
        }
      }
      // drafts テーブル
      return insertChain
    }),
  } as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('runEvergreen', () => {
  it('対象ルールがない場合は空配列を返す', async () => {
    const supabase = makeSupabase([])
    const results = await runEvergreen(supabase)
    expect(results).toEqual([])
  })

  it('max_runs 到達時は max_runs_reached を返す', async () => {
    const rule = makeFullRule({ max_runs: 3, run_count: 3 })
    const supabase = makeSupabase([rule])
    const results = await runEvergreen(supabase)
    expect(results).toEqual([{ rule_id: rule.id, status: 'max_runs_reached' }])
  })

  it('draft INSERT 成功時は drafted を返す', async () => {
    const rule = makeFullRule()
    const supabase = makeSupabase([rule])
    const results = await runEvergreen(supabase)
    expect(results).toEqual([{ rule_id: rule.id, status: 'drafted' }])
  })

  it('draft INSERT 失敗時は error を返す', async () => {
    const rule = makeFullRule()
    const supabase = makeSupabase([rule], { insertError: { message: 'insert failed', code: '23505' } })
    const results = await runEvergreen(supabase)
    expect(results).toEqual([{ rule_id: rule.id, status: 'error' }])
  })
})

describe('buildEvergreenDraft', () => {
  it('drafts INSERT 用のオブジェクトを返す', () => {
    const rule = makeRule()
    const result = buildEvergreenDraft(rule, '【再掲】')
    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('返却オブジェクトは content, type, status, user_id, x_account_id を含む', () => {
    const rule = makeRule()
    const result = buildEvergreenDraft(rule, '【再掲】')
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('type')
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('user_id')
    expect(result).toHaveProperty('x_account_id')
  })

  it("type は 'original' である", () => {
    const rule = makeRule()
    const result = buildEvergreenDraft(rule, '【再掲】')
    // evergreen 再投稿は drafts.type の既存制約 (original|reply|thread) に従い 'original' とする
    expect(result.type).toBe('original')
  })

  it("content は prefix + '\\n\\n' + rule.source_content の形式", () => {
    const rule = makeRule({ source_content: 'テスト内容' })
    const result = buildEvergreenDraft(rule, '【再掲】')
    expect(result.content).toBe('【再掲】\n\nテスト内容')
  })

  it('user_id と x_account_id は rule から引き継ぐ', () => {
    const rule = makeRule({ user_id: 'user-abc', x_account_id: 99 })
    const result = buildEvergreenDraft(rule, '【再掲】')
    expect(result.user_id).toBe('user-abc')
    expect(result.x_account_id).toBe(99)
  })
})
