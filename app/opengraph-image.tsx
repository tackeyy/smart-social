import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(120deg, #0b1120 0%, #17213b 55%, #0f172a 100%)',
          color: 'white',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 74,
              height: 74,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 18,
              background: '#0284fe',
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>Smart Social</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.16,
              letterSpacing: -2,
            }}
          >
            <span>X投稿を、作って</span>
            <span>伸ばして再利用。</span>
          </div>
          <div style={{ marginTop: 28, maxWidth: 760, color: '#c7d7ee', fontSize: 30, lineHeight: 1.5 }}>
            日本語X運用のためのAI SNS管理ツール
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#bde0ff', fontSize: 24 }}>
          <span>AI生成</span>
          <span>予約投稿</span>
          <span>Auto-plug</span>
          <span>Evergreen</span>
        </div>
      </div>
    ),
    size,
  )
}
