import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 60%, #7c3aed 100%)',
          borderRadius: 38,
          position: 'relative',
        }}
      >
        {/* Subtle inner glow */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 38,
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15) 0%, transparent 65%)',
          }}
        />

        {/* Icon content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

          {/* Top pin */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6d28d9' }} />
            </div>
          </div>

          {/* Route line with dots */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 3, height: 10, background: 'rgba(255,255,255,0.7)', borderRadius: 2 }} />
            <div style={{ width: 3, height: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
            <div style={{ width: 3, height: 10, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
          </div>

          {/* Bottom pin with check */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <div style={{
              width: 42, height: 42,
              borderRadius: '50%',
              background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Checkmark */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4.5 10.5L8 14L15.5 6.5"
                  stroke="#4338ca"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

        </div>

        {/* Bottom label */}
        <div style={{
          position: 'absolute',
          bottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: 2,
          }}>
            VISITFLOW
          </span>
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
