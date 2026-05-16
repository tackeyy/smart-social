// ---- 型定義 ----

export interface ParsedDraft {
  source_tweet_url: string
  tweet_id: string
  draft_text: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

// ---- MDファイルのパース ----

export async function parseMdFile(filePath: string): Promise<ParsedDraft[]> {
  const { readFile } = await import('fs/promises')
  const content = await readFile(filePath, 'utf-8')
  const str = typeof content === 'string' ? content : content.toString()
  if (!str) return []

  const results: ParsedDraft[] = []

  const sections = str.split(/^## /m).filter(Boolean)

  for (const section of sections) {
    const urlMatch = section.match(/- \*\*URL\*\*: (https?:\/\/\S+)/)
    const tweetIdMatch = section.match(/- \*\*tweet_id\*\*: (\S+)/)
    const draftMatch = section.match(/- \[ \] \*\*リプライ案\*\*: 「(.+?)」/)

    if (!urlMatch || !draftMatch) continue

    results.push({
      source_tweet_url: urlMatch[1],
      tweet_id: tweetIdMatch ? tweetIdMatch[1] : '',
      draft_text: draftMatch[1],
    })
  }

  return results
}

// ---- メインのインポート処理 ----

export async function importDrafts(
  dir: string,
  opts: { dryRun: boolean }
): Promise<ImportResult> {
  const { readdir } = await import('fs/promises')
  const { join } = await import('path')
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  const files = await readdir(dir)
  const mdFiles = (files as string[]).filter((f: string) => f.endsWith('.md'))

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const file of mdFiles) {
    const filePath = join(dir, file)
    const drafts = await parseMdFile(filePath)

    for (const draft of drafts) {
      const { data: existing } = await supabase
        .from('reply_drafts')
        .select('id')
        .eq('source_tweet_url', draft.source_tweet_url)

      if (existing && existing.length > 0) {
        skipped++
        continue
      }

      if (opts.dryRun) {
        continue
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from('reply_drafts').insert({
        source_tweet_url: draft.source_tweet_url,
        draft_candidates: [
          {
            text: draft.draft_text,
            generated_by: 'import',
            created_at: now,
          },
        ],
      })

      if (error) {
        errors++
      } else {
        imported++
      }
    }
  }

  return { imported, skipped, errors }
}
