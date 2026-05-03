import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          position: 'relative',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {/* Map shape */}
          <path
            d="M4 8L11 5L21 8L28 5V24L21 27L11 24L4 27V8Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="none"
            strokeOpacity="0.9"
          />
          {/* Route dashed line */}
          <path
            d="M10 20 Q16 13 22 16"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 2"
            fill="none"
          />
          {/* Pin A */}
          <circle cx="10" cy="20" r="2.5" fill="white" fillOpacity="0.9" />
          {/* Pin B */}
          <circle cx="22" cy="16" r="2.5" fill="white" fillOpacity="0.9" />
          {/* Pin A dot */}
          <circle cx="10" cy="20" r="1" fill="rgba(0,0,0,0.3)" />
          {/* Pin B dot */}
          <circle cx="22" cy="16" r="1" fill="rgba(0,0,0,0.3)" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 }
  )
}
