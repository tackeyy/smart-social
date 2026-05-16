import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/x/client', () => ({
  uploadMedia: vi.fn(),
}))

import { POST } from '@/app/api/media/upload/route'
import { createClient } from '@/lib/supabase/server'
import { uploadMedia } from '@/lib/x/client'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockUploadMedia = vi.mocked(uploadMedia)
const mockNextResponseJson = vi.mocked(NextResponse.json)

/**
 * Request.formData() を通すと jsdom と Node の File クラスが異なり
 * `instanceof File` が false になる問題を回避するため、
 * request.formData をモックして FormData を直接返す。
 */
function makeRequestWithMockedFormData(formData: FormData): Request {
  const request = new Request('http://localhost/api/media/upload', {
    method: 'POST',
  })
  request.formData = vi.fn().mockResolvedValue(formData)
  return request
}

function makeFile(type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes)
  return new File([buffer], 'test.img', { type })
}

function makeAuthenticatedSupabase(userId = 'user-1') {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn(),
  } as any)
}

function makeUnauthenticatedSupabase() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
  } as any)
}

describe('POST /api/media/upload', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    makeUnauthenticatedSupabase()

    const formData = new FormData()
    formData.append('file', makeFile('image/jpeg', 1024))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: '認証が必要です' },
      { status: 401 }
    )
  })

  it('formData のパース失敗は400を返す', async () => {
    makeAuthenticatedSupabase()

    const request = new Request('http://localhost/api/media/upload', { method: 'POST' })
    request.formData = vi.fn().mockRejectedValue(new Error('parse error'))

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Invalid form data' },
      { status: 400 }
    )
  })

  it('file フィールドがない場合は400を返す', async () => {
    makeAuthenticatedSupabase()

    const formData = new FormData()
    // file フィールドを追加しない
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Missing file field' },
      { status: 400 }
    )
  })

  it('非対応MIMEタイプ (video/mp4) の場合は400を返す', async () => {
    makeAuthenticatedSupabase()

    const formData = new FormData()
    formData.append('file', makeFile('video/mp4', 1024))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unsupported file type: video/mp4. Allowed: image/jpeg, image/png, image/gif' },
      { status: 400 }
    )
  })

  it('ファイルサイズが5MB超の場合は400を返す', async () => {
    makeAuthenticatedSupabase()

    const oversizedFile = makeFile('image/jpeg', 5 * 1024 * 1024 + 1)
    const formData = new FormData()
    formData.append('file', oversizedFile)
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'File too large. Maximum size is 5MB' },
      { status: 400 }
    )
  })

  it('uploadMedia が失敗した場合は422を返す', async () => {
    makeAuthenticatedSupabase()

    mockUploadMedia.mockRejectedValue(new Error('X media upload failed'))

    const formData = new FormData()
    formData.append('file', makeFile('image/jpeg', 1024))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'X media upload failed' },
      { status: 422 }
    )
  })

  it('正常系: image/jpeg → 200 + uploadMedia の返り値', async () => {
    makeAuthenticatedSupabase()

    const uploadResult = { media_id: 'media-123', media_id_string: 'media-123' }
    mockUploadMedia.mockResolvedValue(uploadResult)

    const formData = new FormData()
    formData.append('file', makeFile('image/jpeg', 1024))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(uploadResult, { status: 200 })
  })

  it('正常系: image/png → 200', async () => {
    makeAuthenticatedSupabase()

    const uploadResult = { media_id: 'media-456', media_id_string: 'media-456' }
    mockUploadMedia.mockResolvedValue(uploadResult)

    const formData = new FormData()
    formData.append('file', makeFile('image/png', 2048))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(uploadResult, { status: 200 })
  })

  it('正常系: image/gif → 200', async () => {
    makeAuthenticatedSupabase()

    const uploadResult = { media_id: 'media-789', media_id_string: 'media-789' }
    mockUploadMedia.mockResolvedValue(uploadResult)

    const formData = new FormData()
    formData.append('file', makeFile('image/gif', 4096))
    const request = makeRequestWithMockedFormData(formData)

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(uploadResult, { status: 200 })
  })
})
