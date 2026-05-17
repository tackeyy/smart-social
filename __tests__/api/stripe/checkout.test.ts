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
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

import { POST } from '@/app/api/stripe/checkout/route'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)
const mockStripeCheckoutCreate = vi.mocked(stripe.checkout.sessions.create)
const mockStripeCustomersCreate = vi.mocked(stripe.customers.create)

/**
 * POST /api/stripe/checkout のテスト
 *
 * 対象ファイル: app/api/stripe/checkout/route.ts
 *
 * 仕様:
 * - リクエストボディに plan を受け取る
 * - 未認証の場合は401
 * - plan が 'free'/'pro'/'business' 以外の場合は400
 * - 'free' プランへのチェックアウトは400（課金不要）
 * - 認証済み + 正常な plan('pro') の場合は Stripe checkout セッション URL を返す（200）
 * - Stripe エラー時は500
 */
describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Price ID 環境変数のデフォルト設定
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly_test'
    process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_pro_yearly_test'
    process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID = 'price_business_monthly_test'
    process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID = 'price_business_yearly_test'
    // Stripe 顧客作成のデフォルトモック
    mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_test_new' } as any)
  })

  it('未認証の場合は401を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 401 }
    )
  })

  it('plan パラメータが不正な場合は400を返す（"free"/"pro"/"business" 以外）', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'enterprise' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('plan が空文字の場合は400を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: '' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('plan が未指定（undefined）の場合は400を返す', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('"free" プランへのチェックアウトリクエストは400を返す（Freeは課金不要）', async () => {
    // Arrange
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'free' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
    // Stripe に問い合わせていないことを確認
    expect(mockStripeCheckoutCreate).not.toHaveBeenCalled()
  })

  it('認証済み + 正常な plan("pro") の場合はStripe checkout セッション URL を返す（200）', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/pay/cs_test_abc123'

    mockStripeCheckoutCreate.mockResolvedValue({
      url: mockSessionUrl,
      id: 'cs_test_abc123',
    } as any)

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockStripeCheckoutCreate).toHaveBeenCalledOnce()
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: mockSessionUrl }),
      expect.objectContaining({ status: 200 })
    )
  })

  it('認証済み + 正常な plan("business") の場合も Stripe checkout セッション URL を返す（200）', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/pay/cs_test_business'

    mockStripeCheckoutCreate.mockResolvedValue({
      url: mockSessionUrl,
      id: 'cs_test_business',
    } as any)

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'business' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockStripeCheckoutCreate).toHaveBeenCalledOnce()
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: mockSessionUrl }),
      expect.objectContaining({ status: 200 })
    )
  })

  it('Stripeエラー時は500を返す', async () => {
    // Arrange
    mockStripeCheckoutCreate.mockRejectedValue(new Error('Stripe API error'))

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('Stripe が url=null を返した場合は500を返す（セッション作成失敗）', async () => {
    // Arrange
    mockStripeCheckoutCreate.mockResolvedValue({
      url: null,
      id: 'cs_test_no_url',
    } as any)

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('DB にカスタマーIDが存在する場合は新規顧客作成をスキップして既存IDを使う', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/pay/cs_test_existing'
    mockStripeCheckoutCreate.mockResolvedValue({ url: mockSessionUrl, id: 'cs_test_existing' } as any)

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { stripe_customer_id: 'cus_existing_123' },
            error: null,
          }),
        }),
      }),
    })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: mockFrom,
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    })

    // Act
    await POST(request)

    // Assert: 既存 customer ID を使うので新規作成はしない
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled()
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing_123' }),
      expect.anything()
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: mockSessionUrl }),
      expect.objectContaining({ status: 200 })
    )
  })

  it('billing=yearly を指定した場合は年額 Price ID を使う', async () => {
    // Arrange
    const mockSessionUrl = 'https://checkout.stripe.com/pay/cs_test_yearly'
    mockStripeCheckoutCreate.mockResolvedValue({ url: mockSessionUrl, id: 'cs_test_yearly' } as any)

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn(),
    } as any)

    const request = new Request('http://localhost/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro', billing: 'yearly' }),
    })

    // Act
    await POST(request)

    // Assert: 年額 Price ID が line_items に設定されている
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro_yearly_test', quantity: 1 }],
      }),
      expect.anything()
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ url: mockSessionUrl }),
      expect.objectContaining({ status: 200 })
    )
  })
})
