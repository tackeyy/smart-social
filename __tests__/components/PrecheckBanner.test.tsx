import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { PrecheckBanner } from '@/components/drafts/PrecheckBanner'
import type { PrecheckResult } from '@/lib/precheck/engine'

describe('PrecheckBanner', () => {
  it('resultがnullの場合は何も表示しない', () => {
    const { container } = render(React.createElement(PrecheckBanner, { result: null }))
    expect(container.firstChild).toBeNull()
  })

  it('auto_passの場合は緑のバナーを表示する', () => {
    const result: PrecheckResult = { decision: 'auto_pass', score: 95, reasons: [], suggestions: [] }
    render(React.createElement(PrecheckBanner, { result }))
    expect(screen.getByText(/品質チェック通過/)).toBeTruthy()
    expect(screen.getByText(/95/)).toBeTruthy()
  })

  it('manual_reviewの場合は黄のバナーと理由を表示する', () => {
    const result: PrecheckResult = {
      decision: 'manual_review',
      score: 60,
      reasons: ['根拠が不明確な記述があります'],
      suggestions: [],
    }
    render(React.createElement(PrecheckBanner, { result }))
    expect(screen.getByText(/確認が必要な箇所があります/)).toBeTruthy()
    expect(screen.getByText('根拠が不明確な記述があります')).toBeTruthy()
  })

  it('blockedの場合は赤のバナーと修正提案を表示する', () => {
    const result: PrecheckResult = {
      decision: 'blocked',
      score: 5,
      reasons: ['断定的税務助言が含まれています'],
      suggestions: ['「〜できます」を「〜の可能性があります」に変更してください'],
    }
    render(React.createElement(PrecheckBanner, { result }))
    expect(screen.getByText(/この投稿はブロックされました/)).toBeTruthy()
    expect(screen.getByText('断定的税務助言が含まれています')).toBeTruthy()
    expect(screen.getByText('「〜できます」を「〜の可能性があります」に変更してください')).toBeTruthy()
  })
})
