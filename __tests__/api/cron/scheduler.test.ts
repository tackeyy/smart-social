import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/cron/scheduler/route'

// Supabaseクライアントをモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// next/server のNextResponseをモック
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}))

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const mockCreateClient = vi.mocked(createClient)
const mockNextResponseJson = vi.mocked(NextResponse.json)

describe('GET /api/cron/scheduler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: 'test-secret' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('CRON_SECRETヘッダーなしは401を返す', async () => {
    // Arrange
    const request = new Request('http://localhost/api/cron/scheduler')

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('CRON_SECRETが不一致の場合は401を返す', async () => {
    // Arrange
    const request = new Request('http://localhost/api/cron/scheduler', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })

  it('pending投稿がある場合はX API呼び出し後にstatus=postedで返す', async () => {
    // Arrange: アトミック update → select パターン
    const mockPosts = [
      { id: 'post-1', status: 'processing', retry_count: 0, drafts: { content: 'Hello' } },
      { id: 'post-2', status: 'processing', retry_count: 0, drafts: { content: 'World' } },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 'tweet-1', text: 'Hello' } }),
    })

    // update().eq().lte().lt().select() チェーンで処理対象を返す
    const mockUpdateQueryBuilder = {
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: mockPosts, error: null }),
    }
    // 成功時の posted 更新用
    const mockUpdatePostedQueryBuilder = {
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn()
          .mockReturnValueOnce(mockUpdateQueryBuilder)   // 1回目: processing更新
          .mockReturnValue(mockUpdatePostedQueryBuilder), // 2回目以降: posted更新
      }),
    } as any)

    const request = new Request('http://localhost/api/cron/scheduler', {
      headers: { authorization: 'Bearer test-secret' },
    })

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        processed: 2,
        results: expect.arrayContaining([
          expect.objectContaining({ id: 'post-1', status: 'posted' }),
          expect.objectContaining({ id: 'post-2', status: 'posted' }),
        ]),
      })
    )

    // posted_tweet_id が DB 更新に含まれていることを検証
    const fromMock = mockCreateClient.mock.results[0].value.from as ReturnType<typeof vi.fn>
    const updateMock = fromMock.mock.results[0].value.update as ReturnType<typeof vi.fn>
    // 2回目以降の update 呼び出し（posted 更新）に posted_tweet_id が含まれること
    const postedUpdateCalls = updateMock.mock.calls.slice(1)
    for (const [updateArg] of postedUpdateCalls) {
      expect(updateArg).toMatchObject({
        status: 'posted',
        posted_tweet_id: 'tweet-1',
        posted_at: expect.any(String),
      })
    }
  })

  it('pending投稿がない場合はprocessed=0を返す', async () => {
    // Arrange
    const mockUpdateQueryBuilder = {
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockCreateClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue(mockUpdateQueryBuilder),
      }),
    } as any)

    const request = new Request('http://localhost/api/cron/scheduler', {
      headers: { authorization: 'Bearer test-secret' },
    })

    // Act
    await GET(request)

    // Assert
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ processed: 0 })
    )
  })
})
