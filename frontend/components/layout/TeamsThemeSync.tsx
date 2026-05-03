'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

function teamsThemeToApp(teamsTheme: string): 'light' | 'dark' {
  return teamsTheme === 'default' ? 'light' : 'dark'
}

export function TeamsThemeSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    if (window.self === window.top) return

    import('@microsoft/teams-js').then(async (teams) => {
      try {
        await Promise.race([
          teams.app.initialize(),
          new Promise<never>((_, rej) => setTimeout(() => rej(), 5000)),
        ])

        const context = await teams.app.getContext()
        setTheme(teamsThemeToApp(context.app.theme))

        teams.app.registerOnThemeChangeHandler((newTheme) => {
          setTheme(teamsThemeToApp(newTheme))
        })
      } catch {
        // Not in Teams — leave theme as system default
      }
    })
  }, [setTheme])

  return null
}
