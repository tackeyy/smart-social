import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/server の NextResponse をモック
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

// lib/supabase/server をモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// lib/stripe をモック
vi.mock('@/lib/stripe', () => ({
  stripe: {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

import { POST } from '@/app/api/stripe/portal/route'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockStripeBillingPortalCreate = vi.mocked(stripe.billingPortal.sessions.create)

/**
 * POST /api/stripe/portal のテスト
 *
 * 対象ファイル: app/api/stripe/portal/route.ts
 *
 * 仕様:
 * - 未認証の場合は401
 * - subscriptionsテーブルにレコードなし（またはstripe_customer_idがnull）→ 400
 * - 認証済み + stripe_customer_idあり → Stripe portal セッション URL を含む200
 * - Stripe API エラー → 500
 */
describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    // Act
    await POST()

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 401 }
    )
  })

  it('subscriptionsテーブルにレコードがない場合は400を返す', async () => {
    // Arrange
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockFrom,
    } as any)

    // Act
    await POST()

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
    expect(mockStripeBillingPortalCreate).not.toHaveBeenCalled()
  })

  it('stripe_customer_idがnullの場合は400を返す', async () => {
    // Arrange
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { stripe_customer_id: null },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockFrom,
    } as any)

    // Act
    await POST()

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
    expect(mockStripeBillingPortalCreate).not.toHaveBeenCalled()
  })

  it('認証済み + stripe_customer_idあり → Stripe portal セッション URL を含む200を返す', async () => {
    // Arrange
    const mockPortalUrl = 'https://billing.stripe.com/session/bps_test_abc123'

    mockStripeBillingPortalCreate.mockResolvedValue({
      url: mockPortalUrl,
      id: 'bps_test_abc123',
    } as any)

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { stripe_customer_id: 'cus_test_abc123' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockFrom,
    } as any)

    // Act
    await POST()

    // Assert
    expect(mockStripeBillingPortalCreate).toHaveBeenCalledOnce()
    expect(mockStripeBillingPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test_abc123' })
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: mockPortalUrl }),
      expect.objectContaining({ status: 200 })
    )
  })

  it('Stripe API エラー時は500を返す', async () => {
    // Arrange
    mockStripeBillingPortalCreate.mockRejectedValue(new Error('Stripe API error'))

    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { stripe_customer_id: 'cus_test_abc123' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: mockFrom,
    } as any)

    // Act
    await POST()

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })
})
