import type { PrecheckResult } from '@/lib/precheck/engine'

interface Props {
  result: PrecheckResult | null
}

export function PrecheckBanner({ result }: Props) {
  if (!result) return null

  if (result.decision === 'auto_pass') {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-800">
        ✅ 品質チェック通過（スコア: {result.score}）
      </div>
    )
  }

  if (result.decision === 'manual_review') {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 space-y-1">
        <p className="font-medium">🟡 確認が必要な箇所があります（スコア: {result.score}）</p>
        {result.reasons.length > 0 && (
          <ul className="list-disc pl-4 space-y-0.5">
            {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 space-y-1">
      <p className="font-medium">🔴 この投稿はブロックされました</p>
      {result.reasons.length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5">
          {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {result.suggestions.length > 0 && (
        <div className="mt-1">
          <p className="font-medium">修正提案:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
