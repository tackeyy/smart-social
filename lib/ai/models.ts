import { anthropic } from '@ai-sdk/anthropic'

export const STYLE_PROFILE_MODEL = anthropic('claude-sonnet-4-6')
export const DRAFT_MODEL = anthropic('claude-sonnet-4-6')
export const PRECHECK_MODEL = anthropic('claude-haiku-4-5-20251001')

// generated_by / model_version フィールド用の文字列定数
export const STYLE_PROFILE_MODEL_ID = 'claude-sonnet-4-6'
export const DRAFT_MODEL_ID = 'claude-sonnet-4-6'
