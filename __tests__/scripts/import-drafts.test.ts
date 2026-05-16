import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Supabase クライアントをモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// fs/promises をモック
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}))

// path をモック（必要に応じて）
// vi.mock('path') は不要（Node.js 標準なので実パスで動く）

import { createClient } from '@supabase/supabase-js'
import { readFile, readdir } from 'fs/promises'

const mockCreateClient = vi.mocked(createClient)
const mockReadFile = vi.mocked(readFile)
const mockReaddir = vi.mocked(readdir)

/**
 * import-drafts.ts のテスト（TDD Red フェーズ）
 *
 * 対象ファイル: scripts/import-drafts.ts
 * ※ 実装はまだ存在しない。テストが失敗することを確認すること（Red）。
 *
 * MDファイル形式（MDキュー形式）:
 * ## 候補 1
 * - **URL**: https://x.com/i/status/123456
 * - **tweet_id**: 123456
 * - **スキャン日時**: 2026-03-28T15:53:29+09:00
 * - [ ] **リプライ案**: 「ドラフトテキスト」
 */
describe('import-drafts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('parseMdFile (MDファイルのパース)', () => {
    it('正常系: MDファイルからURLとドラフトテキストを抽出できる', async () => {
      // Arrange
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/123456
- **tweet_id**: 123456
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [ ] **リプライ案**: 「テストドラフトテキスト」

## 候補 2

- **URL**: https://x.com/i/status/789012
- **tweet_id**: 789012
- **スキャン日時**: 2026-03-28T16:00:00+09:00

- [ ] **リプライ案**: 「2件目のドラフト」
`

      mockReadFile.mockResolvedValue(mdContent)

      // 実装: import { parseMdFile } from '@/scripts/import-drafts'
      const { parseMdFile } = await import('@/scripts/import-drafts')

      // Act
      const result = await parseMdFile('/path/to/test.md')

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        source_tweet_url: 'https://x.com/i/status/123456',
        tweet_id: '123456',
        draft_text: 'テストドラフトテキスト',
      })
      expect(result[1]).toMatchObject({
        source_tweet_url: 'https://x.com/i/status/789012',
        tweet_id: '789012',
        draft_text: '2件目のドラフト',
      })
    })

    it('異常系: チェック済み（[x]）のリプライ案はスキップする', async () => {
      // Arrange
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/111
- **tweet_id**: 111
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [x] **リプライ案**: 「チェック済みドラフト」

## 候補 2

- **URL**: https://x.com/i/status/222
- **tweet_id**: 222
- **スキャン日時**: 2026-03-28T16:00:00+09:00

- [ ] **リプライ案**: 「未チェックドラフト」
`
      mockReadFile.mockResolvedValue(mdContent)

      const { parseMdFile } = await import('@/scripts/import-drafts')

      // Act
      const result = await parseMdFile('/path/to/test.md')

      // Assert: [x] はスキップ、[ ] のみ抽出
      expect(result).toHaveLength(1)
      expect(result[0].source_tweet_url).toBe('https://x.com/i/status/222')
    })

    it('エッジケース: 空のMDファイルは空配列を返す', async () => {
      // Arrange
      mockReadFile.mockResolvedValue('')

      const { parseMdFile } = await import('@/scripts/import-drafts')

      // Act
      const result = await parseMdFile('/path/to/empty.md')

      // Assert
      expect(result).toEqual([])
    })

    it('エッジケース: URLもドラフトテキストも存在しないセクションはスキップ', async () => {
      // Arrange
      const mdContent = `## セクション（URLなし）

- **スキャン日時**: 2026-03-28T15:53:29+09:00
`
      mockReadFile.mockResolvedValue(mdContent)

      const { parseMdFile } = await import('@/scripts/import-drafts')

      // Act
      const result = await parseMdFile('/path/to/test.md')

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('importDrafts (メインの取り込み処理)', () => {
    it('--dry-run オプション時はDBへのINSERTを呼ばない', async () => {
      // Arrange
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/123456
- **tweet_id**: 123456
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [ ] **リプライ案**: 「ドラフトテキスト」
`
      mockReaddir.mockResolvedValue(['test.md'] as unknown as Awaited<ReturnType<typeof readdir>>)
      mockReadFile.mockResolvedValue(mdContent)

      const mockInsert = vi.fn()
      mockCreateClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: mockInsert,
        }),
      } as any)

      const { importDrafts } = await import('@/scripts/import-drafts')

      // Act
      await importDrafts('/path/to/md-dir', { dryRun: true, xAccountId: 1 })

      // Assert: INSERTが呼ばれていない
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('正常系: source_tweet_urlが既存の場合はスキップ（重複チェック）', async () => {
      // Arrange: 既にDBに同じURLが存在する
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/123456
- **tweet_id**: 123456
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [ ] **リプライ案**: 「ドラフトテキスト」
`
      mockReaddir.mockResolvedValue(['test.md'] as unknown as Awaited<ReturnType<typeof readdir>>)
      mockReadFile.mockResolvedValue(mdContent)

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      // 既存レコードが存在する（重複）
      mockCreateClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'existing-id', source_tweet_url: 'https://x.com/i/status/123456' }],
            error: null,
          }),
          insert: mockInsert,
        }),
      } as any)

      const { importDrafts } = await import('@/scripts/import-drafts')

      // Act
      const result = await importDrafts('/path/to/md-dir', { dryRun: false, xAccountId: 1 })

      // Assert: スキップされてINSERTは呼ばれない
      expect(mockInsert).not.toHaveBeenCalled()
      expect(result.skipped).toBe(1)
    })

    it('正常系: INSERTが成功したらimported件数をカウント', async () => {
      // Arrange
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/111111
- **tweet_id**: 111111
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [ ] **リプライ案**: 「1件目のドラフト」

## 候補 2

- **URL**: https://x.com/i/status/222222
- **tweet_id**: 222222
- **スキャン日時**: 2026-03-28T16:00:00+09:00

- [ ] **リプライ案**: 「2件目のドラフト」
`
      mockReaddir.mockResolvedValue(['test.md'] as unknown as Awaited<ReturnType<typeof readdir>>)
      mockReadFile.mockResolvedValue(mdContent)

      const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 'new-id' }], error: null })
      // 既存レコードなし（重複なし）
      mockCreateClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: mockInsert,
        }),
      } as any)

      const { importDrafts } = await import('@/scripts/import-drafts')

      // Act
      const result = await importDrafts('/path/to/md-dir', { dryRun: false, xAccountId: 1 })

      // Assert
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('異常系: DBのINSERTに失敗した場合はエラー件数をカウント', async () => {
      // Arrange
      const mdContent = `## 候補 1

- **URL**: https://x.com/i/status/999
- **tweet_id**: 999
- **スキャン日時**: 2026-03-28T15:53:29+09:00

- [ ] **リプライ案**: 「エラー想定ドラフト」
`
      mockReaddir.mockResolvedValue(['test.md'] as unknown as Awaited<ReturnType<typeof readdir>>)
      mockReadFile.mockResolvedValue(mdContent)

      mockCreateClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      } as any)

      const { importDrafts } = await import('@/scripts/import-drafts')

      // Act
      const result = await importDrafts('/path/to/md-dir', { dryRun: false, xAccountId: 1 })

      // Assert
      expect(result.errors).toBe(1)
      expect(result.imported).toBe(0)
    })
  })
})
