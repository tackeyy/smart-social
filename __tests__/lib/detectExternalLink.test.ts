import { describe, it, expect } from 'vitest'
import { detectExternalLink } from '@/lib/utils/detectExternalLink'

describe('detectExternalLink', () => {
  it('https外部URLを含む場合はtrueを返す', () => {
    expect(detectExternalLink('詳しくはこちら https://example.com をご覧ください')).toBe(true)
  })

  it('http外部URLを含む場合はtrueを返す', () => {
    expect(detectExternalLink('http://example.com のサイトです')).toBe(true)
  })

  it('URLを含まないテキストはfalseを返す', () => {
    expect(detectExternalLink('今日も良い天気ですね！頑張りましょう')).toBe(false)
  })

  it('空文字列はfalseを返す', () => {
    expect(detectExternalLink('')).toBe(false)
  })

  it('twitter.comのURLは例外でfalseを返す', () => {
    expect(detectExternalLink('https://twitter.com/user/status/123')).toBe(false)
  })

  it('x.comのURLは例外でfalseを返す', () => {
    expect(detectExternalLink('https://x.com/user/status/456')).toBe(false)
  })

  it('t.coのみのURLは例外でfalseを返す', () => {
    expect(detectExternalLink('チェックしてください https://t.co/abcd1234')).toBe(false)
  })

  it('外部URLとx.comが混在する場合はtrueを返す', () => {
    expect(detectExternalLink('https://x.com/abc と https://example.com')).toBe(true)
  })

  it('pic.twitter.comは例外でfalseを返す', () => {
    expect(detectExternalLink('https://pic.twitter.com/xxx')).toBe(false)
  })
})
