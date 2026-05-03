'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
] as const

type LocaleCode = (typeof LOCALES)[number]['code']

interface Props {
  currentLocale: string
}

export function LanguageSwitcher({ currentLocale }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const setLocale = (locale: LocaleCode) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    startTransition(() => router.refresh())
  }

  const current = LOCALES.find((l) => l.code === currentLocale) ?? LOCALES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground w-full justify-start px-2">
          <Languages className="h-3.5 w-3.5 shrink-0" suppressHydrationWarning />
          <span className="text-xs">{current.flag} {current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={l.code === currentLocale ? 'font-semibold' : ''}
          >
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
