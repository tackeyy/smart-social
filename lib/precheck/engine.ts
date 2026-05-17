import { generateText } from 'ai'
import { PRECHECK_MODEL } from '@/lib/ai/models'
import type { ClaudeUsage } from '@/lib/ai/client'

export type PrecheckDecision = 'auto_pass' | 'manual_review' | 'blocked'
export type TemplateChannel = 'post' | 'reply' | 'dm'
export type RuleSeverity = 'critical' | 'major' | 'minor'

export interface PrecheckRule {
  category: string
  severity: RuleSeverity
  message: string
}

export interface PrecheckResult {
  decision: PrecheckDecision
  score: number
  reasons: string[]
  suggestions: string[]
}

const MAX_CHARS = 280

export function check280CharLimit(text: string): PrecheckRule | null {
  if (text.length <= MAX_CHARS) return null
  return {
    category: 'char_limit',
    severity: 'critical',
    message: `文字数が${text.length}文字です（上限${MAX_CHARS}文字）`,
  }
}

const SYSTEM_PROMPT = `あなたはX（Twitter）投稿品質チェックの専門家です。
特に税理士・会計士・士業向けの投稿コンプライアンスに詳しく、以下の基準で投稿テキストを審査します。

## 判定基準

### blocked（実行禁止）
- 断定的税務助言：「〜すれば節税できます」「絶対に〜」「必ず〜」等の確定表現
- 根拠のない法令解釈の断言
- 攻撃的・煽り表現、特定個人・組織への誹謗中傷

### manual_review（要確認）
- 根拠が不明確な数値や制度解説
- グレーゾーンの税務判断
- 出典なしの統計引用

### auto_pass（問題なし）
- 上記に該当しない、適切な情報提供
- 「〜の可能性があります」「一般的には〜」等の適切な留保表現

## 出力形式（必ずJSONのみ返すこと）
{
  "decision": "auto_pass" | "manual_review" | "blocked",
  "score": 0-100,
  "reasons": ["理由1", "理由2"],
  "suggestions": ["改善提案1", "改善提案2"]
}`

export async function runPrecheck(
  text: string,
  channel: TemplateChannel
): Promise<{ result: PrecheckResult; usage: ClaudeUsage | null }> {
  const charLimitRule = check280CharLimit(text)
  if (charLimitRule) {
    return {
      result: {
        decision: 'blocked',
        score: 0,
        reasons: [charLimitRule.message],
        suggestions: [`${text.length - MAX_CHARS}文字削減してください`],
      },
      usage: null,
    }
  }

  try {
    const { text: rawText, usage } = await generateText({
      model: PRECHECK_MODEL,
      system: SYSTEM_PROMPT,
      prompt: `以下の${channel}投稿を審査してください:\n\n${text}`,
      maxOutputTokens: 512,
    })

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in response')

    const parsed = JSON.parse(jsonMatch[0]) as PrecheckResult
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 50))

    return {
      result: {
        decision: parsed.decision ?? 'manual_review',
        score,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      },
      usage: { input_tokens: usage.inputTokens ?? 0, output_tokens: usage.outputTokens ?? 0 },
    }
  } catch {
    return {
      result: {
        decision: 'manual_review',
        score: 50,
        reasons: ['自動チェックを完了できませんでした。内容を確認してください。'],
        suggestions: [],
      },
      usage: null,
    }
  }
}
