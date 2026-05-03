'use client'

import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function LoginButton() {
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const teamsRef = useRef<typeof import('@microsoft/teams-js') | null>(null)

  useEffect(() => {
    if (window.self === window.top) return
    setDetecting(true)
    import('@microsoft/teams-js').then(async (teams) => {
      try {
        await Promise.race([
          teams.app.initialize(),
          new Promise<never>((_, rej) => setTimeout(() => rej(), 5000)),
        ])
        teams.app.notifyAppLoaded()
        teamsRef.current = teams
      } catch {
        // Not in Teams
      }
      setDetecting(false)
    })
  }, [])

  const handleSignIn = async () => {
    setLoading(true)

    if (teamsRef.current) {
      const teams = teamsRef.current

      // 1. Teams SSO — silent, no popup
      try {
        const ssoToken = await teams.authentication.getAuthToken()
        const res = await fetch('/api/auth/teams-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: ssoToken }),
        })
        if (res.ok) {
          window.location.replace('/planning')
          return
        }
      } catch {
        // SSO failed — fall through to popup
      }

      // 2. Popup fallback
      try {
        const callbackUrl = encodeURIComponent('/auth/teams-callback')
        await teams.authentication.authenticate({
          url: `${window.location.origin}/api/auth/signin/azure-ad?callbackUrl=${callbackUrl}`,
          width: 600,
          height: 535,
        })
        window.location.replace('/planning')
        return
      } catch {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data?.user) {
          window.location.replace('/planning')
          return
        }
      }

      setLoading(false)
    } else {
      // Regular browser
      await signIn('azure-ad', { callbackUrl: '/planning' })
    }
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading || detecting}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
        bg-white text-slate-800 font-medium text-sm
        hover:bg-slate-50 active:scale-[0.98] transition-all
        disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
    >
      {loading || detecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MicrosoftIcon />
      )}
      {loading ? 'Signing in…' : detecting ? 'Loading…' : 'Continue with Microsoft'}
    </button>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}
