'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

// Opened by Teams as an auth popup. Signals success to the parent Teams tab.
// Does NOT call app.initialize() — notifySuccess works directly in popup context.
export default function TeamsCallbackPage() {
  useEffect(() => {
    import('@microsoft/teams-js').then((teams) => {
      try {
        teams.authentication.notifySuccess()
      } catch {
        // Not in a Teams popup — close the window so the user returns to Teams
        window.close()
      }
    }).catch(() => {
      window.close()
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Completing sign-in…</span>
      </div>
    </div>
  )
}
