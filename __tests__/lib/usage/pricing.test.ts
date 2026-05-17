import { describe, it, expect } from 'vitest'
import { calcCostUsd, MODEL_PRICING } from '@/lib/usage/pricing'

describe('MODEL_PRICING', () => {
  it('claude-sonnet-4-6 の単価が定義されている', () => {
    expect(MODEL_PRICING['claude-sonnet-4-6']).toBeDefined()
    expect(MODEL_PRICING['claude-sonnet-4-6'].input).toBe(3.0)
    expect(MODEL_PRICING['claude-sonnet-4-6'].output).toBe(15.0)
  })

  it('claude-haiku-4-5-20251001 の単価が定義されている', () => {
    expect(MODEL_PRICING['claude-haiku-4-5-20251001']).toBeDefined()
    expect(MODEL_PRICING['claude-haiku-4-5-20251001'].input).toBe(0.8)
    expect(MODEL_PRICING['claude-haiku-4-5-20251001'].output).toBe(4.0)
  })
})

describe('calcCostUsd', () => {
  it('claude-sonnet-4-6: 1000 input tokens のコストを正しく計算する', () => {
    // $3/MTok * 1000tokens / 1,000,000 = $0.003
    const cost = calcCostUsd('claude-sonnet-4-6', 1000, 0)
    expect(cost).toBeCloseTo(0.003, 6)
  })

  it('claude-sonnet-4-6: 1000 output tokens のコストを正しく計算する', () => {
    // $15/MTok * 1000tokens / 1,000,000 = $0.015
    const cost = calcCostUsd('claude-sonnet-4-6', 0, 1000)
    expect(cost).toBeCloseTo(0.015, 6)
  })

  it('claude-sonnet-4-6: input + output 混在のコストを正しく計算する', () => {
    // input: $3/MTok * 500tokens / 1M = $0.0015
    // output: $15/MTok * 200tokens / 1M = $0.003
    // total: $0.0045
    const cost = calcCostUsd('claude-sonnet-4-6', 500, 200)
    expect(cost).toBeCloseTo(0.0045, 6)
  })

  it('claude-haiku-4-5-20251001: コストを正しく計算する', () => {
    // input: $0.8/MTok * 1000tokens / 1M = $0.0008
    // output: $4/MTok * 512tokens / 1M = $0.002048
    // total: $0.002848
    const cost = calcCostUsd('claude-haiku-4-5-20251001', 1000, 512)
    expect(cost).toBeCloseTo(0.002848, 6)
  })

  it('未知モデルは 0 を返す', () => {
    const cost = calcCostUsd('unknown-model', 1000, 500)
    expect(cost).toBe(0)
  })

  it('トークン数が 0 の場合は 0 を返す', () => {
    const cost = calcCostUsd('claude-sonnet-4-6', 0, 0)
    expect(cost).toBe(0)
  })
})
