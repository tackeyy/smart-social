import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { uploadMedia } from '@/lib/x/client'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'] as const
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  if (!isAllowedMimeType(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: image/jpeg, image/png, image/gif` },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 5MB` },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const mediaData = Buffer.from(arrayBuffer)

  try {
    const result = await uploadMedia({ mediaData, mimeType: file.type })
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload media'
    console.error('Media upload failed:', { userId: user.id, error: err })
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
