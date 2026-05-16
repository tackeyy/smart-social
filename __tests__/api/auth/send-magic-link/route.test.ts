import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: Object.assign(
    vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
    {
      json: vi.fn((body: unknown, init?: ResponseInit) => ({
        body,
        status: init?.status ?? 200,
        json: async () => body,
      })),
    }
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { POST } from '@/app/api/auth/send-magic-link/route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('POST /api/auth/send-magic-link', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    delete process.env.ALLOWED_EMAIL
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it('email が欠損している場合は400を返す', async () => {
    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('ALLOWED_EMAIL がセットされていて異なるメールを送信した場合は403を返す', async () => {
    process.env.ALLOWED_EMAIL = 'allowed@example.com'

    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'other@example.com' }),
    })

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 403 }
    )
  })

  it('ALLOWED_EMAIL がセットされていて同じメールを送信した場合は signInWithOtp が呼ばれる', async () => {
    process.env.ALLOWED_EMAIL = 'allowed@example.com'

    const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    } as any)

    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'allowed@example.com' }),
    })

    await POST(request)

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'allowed@example.com' })
    )
  })

  it('ALLOWED_EMAIL が未設定の場合はメールに関わらず signInWithOtp が呼ばれる', async () => {
    const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    } as any)

    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anyone@example.com' }),
    })

    await POST(request)

    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'anyone@example.com' })
    )
  })

  it('signInWithOtp が失敗（error返却）した場合は500を返す', async () => {
    const mockSignInWithOtp = vi.fn().mockResolvedValue({
      error: { message: 'Email service unavailable' },
    })
    mockCreateClient.mockResolvedValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    } as any)

    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('正常系: signInWithOtp 成功の場合は200で { message: "Magic link sent" } を返す', async () => {
    const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    } as any)

    const request = new Request('http://localhost/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    await POST(request)

    expect(mockNextResponseJson).toHaveBeenCalledWith({ message: 'Magic link sent' })
  })
})
