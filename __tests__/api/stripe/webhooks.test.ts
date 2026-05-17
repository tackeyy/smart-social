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

// lib/stripe をモック（webhooks.constructEvent を含む）
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}))

// @supabase/supabase-js の createClient をモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { POST } from '@/app/api/stripe/webhooks/route'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const mockConstructEvent = vi.mocked(stripe.webhooks.constructEvent)
const mockSubscriptionsRetrieve = vi.mocked(stripe.subscriptions.retrieve)
const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

/** supabase クライアントのモックを構築するヘルパー */
function buildSupabaseMock({
  upsertError = null,
  updateError = null,
}: {
  upsertError?: unknown
  updateError?: unknown
} = {}) {
  const mockUpsert = vi.fn().mockResolvedValue({ error: upsertError })
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  })
  const mockFrom = vi.fn().mockReturnValue({
    upsert: mockUpsert,
    update: mockUpdate,
  })

  return {
    supabaseMock: { from: mockFrom } as any,
    mockFrom,
    mockUpsert,
    mockUpdate,
  }
}

/** テスト用 Request を生成するヘルパー */
function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signature !== undefined) {
    headers['stripe-signature'] = signature
  }
  return new Request('http://localhost/api/stripe/webhooks', {
    method: 'POST',
    headers,
    body,
  })
}

/**
 * POST /api/stripe/webhooks のテスト
 *
 * 対象ファイル: app/api/stripe/webhooks/route.ts
 *
 * 仕様:
 * - stripe-signature ヘッダーなし → 400
 * - 署名検証失敗（constructEvent が throw）→ 400
 * - checkout.session.completed → upsert が呼ばれ200
 * - invoice.payment_succeeded → update が呼ばれ200
 * - invoice.payment_failed → status='past_due' で update され200
 * - customer.subscription.updated → plan/status が同期され200
 * - customer.subscription.deleted → plan='free', status='canceled' になり200
 * - DB upsert エラー → 500（Stripe に再送させるため）
 * - 未知のイベントタイプ → 200（無視）
 */
describe('POST /api/stripe/webhooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // 環境変数のデフォルト設定
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('stripe-signature ヘッダーがない場合は400を返す', async () => {
    // Arrange
    const request = makeRequest('{}')

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
    expect(mockConstructEvent).not.toHaveBeenCalled()
  })

  it('署名検証失敗（constructEvent が throw）→ 400を返す', async () => {
    // Arrange
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature verification failed')
    })

    const request = makeRequest('{}', 'invalid-signature')

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: expect.any(String) },
      { status: 400 }
    )
  })

  it('checkout.session.completed → upsert が呼ばれ200を返す', async () => {
    // Arrange
    const { supabaseMock, mockUpsert } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const fakeSubscription = {
      status: 'active',
      items: { data: [] },
    }
    mockSubscriptionsRetrieve.mockResolvedValue(fakeSubscription as any)

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { user_id: 'user-1', plan: 'pro' },
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"checkout.session.completed"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123')
    expect(mockUpsert).toHaveBeenCalledOnce()
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        stripe_customer_id: 'cus_test_123',
        stripe_subscription_id: 'sub_test_123',
        plan: 'pro',
        status: 'active',
      }),
      { onConflict: 'user_id' }
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })

  it('invoice.payment_succeeded → current_period_end が update され200を返す', async () => {
    // Arrange
    const { supabaseMock, mockUpdate } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const fakeSubscription = {
      items: {
        data: [{ current_period_end: 1893456000 }], // 2030-01-01
      },
    }
    mockSubscriptionsRetrieve.mockResolvedValue(fakeSubscription as any)

    const event = {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          customer: 'cus_test_123',
          parent: {
            subscription_details: {
              subscription: 'sub_test_123',
            },
          },
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"invoice.payment_succeeded"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_test_123')
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })

  it('invoice.payment_failed → status="past_due" で update され200を返す', async () => {
    // Arrange
    const { supabaseMock, mockUpdate } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const event = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_test_123',
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"invoice.payment_failed"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' })
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })

  it('customer.subscription.updated → plan/status が同期され200を返す', async () => {
    // Arrange
    const { supabaseMock, mockUpdate } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_test_123',
          status: 'active',
          metadata: { plan: 'business' },
          cancel_at_period_end: false,
          items: {
            data: [{ current_period_end: 1893456000 }],
          },
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"customer.subscription.updated"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'business',
        status: 'active',
        cancel_at_period_end: false,
      })
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })

  it('customer.subscription.deleted → plan="free", status="canceled" になり200を返す', async () => {
    // Arrange
    const { supabaseMock, mockUpdate } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_test_123',
          status: 'canceled',
          metadata: {},
          cancel_at_period_end: false,
          items: { data: [] },
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"customer.subscription.deleted"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        cancel_at_period_end: false,
      })
    )
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })

  it('DB upsert エラー時は500を返す（Stripe に再送させるため）', async () => {
    // Arrange
    const { supabaseMock } = buildSupabaseMock({
      upsertError: { message: 'DB connection error', code: '08006' },
    })
    mockCreateClient.mockReturnValue(supabaseMock)

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { user_id: 'user-1', plan: 'pro' },
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
        },
      },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"checkout.session.completed"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 500 }
    )
  })

  it('未知のイベントタイプは200を返す（無視）', async () => {
    // Arrange
    const { supabaseMock } = buildSupabaseMock()
    mockCreateClient.mockReturnValue(supabaseMock)

    const event = {
      type: 'payment_intent.created',
      data: { object: {} },
    }
    mockConstructEvent.mockReturnValue(event as any)

    const request = makeRequest('{"type":"payment_intent.created"}', 'valid-sig')

    // Act
    await POST(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { received: true },
      { status: 200 }
    )
  })
})
