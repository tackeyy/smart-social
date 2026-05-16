import { describe, it, expect } from 'vitest'
import { validateTemplateInput } from '@/lib/templates'

describe('validateTemplateInput', () => {
  const validInput = {
    accountId: 'account-uuid-1',
    name: 'フック→要点→CTA型',
    channel: 'post' as const,
    body: '【{{topic}}で損している経営者へ】\n\n・{{point1}}\n詳しくはDMへ',
    tags: ['税務', '経営'],
  }

  it('正常な入力はエラーを返さない', () => {
    const errors = validateTemplateInput(validInput)
    expect(errors).toHaveLength(0)
  })

  it('nameが空の場合はエラーを返す', () => {
    const errors = validateTemplateInput({ ...validInput, name: '' })
    expect(errors).toContain('テンプレート名は必須です')
  })

  it('bodyが空の場合はエラーを返す', () => {
    const errors = validateTemplateInput({ ...validInput, body: '' })
    expect(errors).toContain('本文は必須です')
  })

  it('channelがpost/reply/dm以外の場合はエラーを返す', () => {
    const errors = validateTemplateInput({ ...validInput, channel: 'invalid' as never })
    expect(errors).toContain('チャンネルはpost、reply、dmのいずれかを指定してください')
  })

  it('channelがreplyでも正常', () => {
    const errors = validateTemplateInput({ ...validInput, channel: 'reply' })
    expect(errors).toHaveLength(0)
  })

  it('channelがdmでも正常', () => {
    const errors = validateTemplateInput({ ...validInput, channel: 'dm' })
    expect(errors).toHaveLength(0)
  })

  it('nameが100文字超の場合はエラーを返す', () => {
    const errors = validateTemplateInput({ ...validInput, name: 'a'.repeat(101) })
    expect(errors).toContain('テンプレート名は100文字以内にしてください')
  })

  it('tagsが省略されてもエラーを返さない', () => {
    const { tags: _, ...withoutTags } = validInput
    const errors = validateTemplateInput(withoutTags)
    expect(errors).toHaveLength(0)
  })
})
