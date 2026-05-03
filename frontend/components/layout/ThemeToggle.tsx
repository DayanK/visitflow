'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — render nothing until mounted
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="h-9 w-9"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun className="h-4 w-4" suppressHydrationWarning />
        : <Moon className="h-4 w-4" suppressHydrationWarning />
      }
    </Button>
  )
}
