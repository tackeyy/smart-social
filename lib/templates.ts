import type { TemplateInput } from '@/types/template'

const VALID_CHANNELS = ['post', 'reply', 'dm'] as const

export function validateTemplateInput(input: Omit<TemplateInput, 'tags'> & { tags?: string[] }): string[] {
  const errors: string[] = []

  if (!input.name || input.name.trim() === '') {
    errors.push('テンプレート名は必須です')
  } else if (input.name.length > 100) {
    errors.push('テンプレート名は100文字以内にしてください')
  }

  if (!input.body || input.body.trim() === '') {
    errors.push('本文は必須です')
  }

  if (!VALID_CHANNELS.includes(input.channel as typeof VALID_CHANNELS[number])) {
    errors.push('チャンネルはpost、reply、dmのいずれかを指定してください')
  }

  return errors
}

export const PRESET_TEMPLATES = [
  {
    name: 'フック→要点→CTA型',
    channel: 'post' as const,
    body: '【{{topic}}で損している経営者へ】\n\n・{{point1}}\n・{{point2}}\n・{{point3}}\n\n詳しくはDMまたはコメントへ↓',
    tags: ['汎用', 'フック型'],
  },
  {
    name: '課題→解決策型',
    channel: 'post' as const,
    body: '{{topic}}で悩んでいませんか？\n\n原因は「{{cause}}」です。\n\n解決策：{{solution}}\n\nご相談はDMまで',
    tags: ['汎用', '課題解決型'],
  },
  {
    name: '引用+一次情報型',
    channel: 'reply' as const,
    body: 'これは重要。\n\n私の経験だと{{my_experience}}\n\n特に{{key_point}}は見落としがちなので注意。',
    tags: ['引用RT', '一次情報'],
  },
] as const
