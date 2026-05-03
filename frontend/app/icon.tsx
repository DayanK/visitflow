import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#6366f1',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '7px',
        color: 'white',
        fontSize: '18px',
        fontWeight: '700',
        fontFamily: 'sans-serif',
        letterSpacing: '-1px',
      }}
    >
      VF
    </div>,
    { ...size }
  )
}
