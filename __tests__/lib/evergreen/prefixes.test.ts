import { describe, it, expect } from 'vitest'
import { selectPrefix, buildRepostContent, DEFAULT_PREFIXES } from '@/lib/evergreen/prefixes'

describe('DEFAULT_PREFIXES', () => {
  it('配列で8件以上の要素を持つ', () => {
    expect(Array.isArray(DEFAULT_PREFIXES)).toBe(true)
    expect(DEFAULT_PREFIXES.length).toBeGreaterThanOrEqual(8)
  })
})

describe('selectPrefix', () => {
  it('空配列・前回nullのとき DEFAULT_PREFIXES からランダムに返す', () => {
    const result = selectPrefix([], null)
    expect(DEFAULT_PREFIXES).toContain(result)
  })

  it('前回と同じ接頭辞を避ける（DEFAULT_PREFIXES が複数ある場合）', () => {
    const lastPrefix = DEFAULT_PREFIXES[0]
    // 100回試行して、少なくとも1回は lastPrefix 以外が返ることを確認
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(selectPrefix([], lastPrefix))
    }
    const hasOtherPrefix = [...results].some((r) => r !== lastPrefix)
    expect(hasOtherPrefix).toBe(true)
  })

  it("['A', 'B'] から前回'A'のとき 'B' を返す", () => {
    const result = selectPrefix(['A', 'B'], 'A')
    expect(result).toBe('B')
  })

  it("候補が1種のみのとき前回と同じでも返す（['A'] から前回'A'）", () => {
    const result = selectPrefix(['A'], 'A')
    expect(result).toBe('A')
  })
})

describe('buildRepostContent', () => {
  it("接頭辞+'\\n\\n'+本文 を返す", () => {
    const result = buildRepostContent('【再掲】', 'テスト内容')
    expect(result).toBe('【再掲】\n\nテスト内容')
  })

  it('接頭辞+本文が280文字超の場合、281文字以上にならない', () => {
    // 接頭辞が5文字 + '\n\n' で 7文字、残り 273文字でも合計280になるよう調整
    const prefix = '【再掲】'          // 4文字
    const longBody = 'あ'.repeat(300) // 大幅にオーバー
    const result = buildRepostContent(prefix, longBody)
    // X の文字数制限: 280文字
    expect(result.length).toBeLessThanOrEqual(280)
  })
})
