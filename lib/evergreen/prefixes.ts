export const DEFAULT_PREFIXES = [
  '【再掲】',
  '【保存版】',
  '【読み返したい】',
  '過去に反響が大きかったので再シェア👇',
  'フォロワーさんが増えたので改めて👇',
  '新規フォロワーさんへ。以前書いた話👇',
  'これ、今でも大切にしている考え方👇',
  '定期的に届けたい内容なので再投稿します👇',
] as const

/**
 * prefix_pool から前回と異なる接頭辞をランダムに選択する。
 * pool が空の場合は DEFAULT_PREFIXES を使用する。
 * 候補が1種のみの場合は前回と同じでも返す。
 */
export function selectPrefix(pool: string[], lastPrefix: string | null): string {
  const candidates = pool.length > 0 ? pool : [...DEFAULT_PREFIXES]

  // 前回と異なる候補に絞る（候補が複数の場合のみ）
  const filtered = lastPrefix !== null && candidates.length > 1
    ? candidates.filter((p) => p !== lastPrefix)
    : candidates

  const idx = Math.floor(Math.random() * filtered.length)
  return filtered[idx]
}

/**
 * 接頭辞と本文を結合し、280文字に収める。
 */
export function buildRepostContent(prefix: string, sourceContent: string): string {
  const combined = `${prefix}\n\n${sourceContent}`
  return combined.slice(0, 280)
}
