'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Route, ClipboardList, Settings, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const locale = useLocale()

  const navItems = [
    { href: '/planning',     label: t('planning'),     icon: Route },
    { href: '/visits',       label: t('visits'),       icon: ClipboardList },
    { href: '/settings',     label: t('settings'),     icon: Settings },
    { href: '/subscription', label: t('subscription'), icon: CreditCard },
  ]

  return (
    <aside className="flex flex-col w-[var(--sidebar-width)] shrink-0 border-r bg-card h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Route className="w-4 h-4 text-primary-foreground" suppressHydrationWarning />
        </div>
        <span className="font-bold text-lg tracking-tight">VisitFlow</span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" suppressHydrationWarning />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — language switcher */}
      <div className="px-3 py-3 border-t space-y-1">
        <LanguageSwitcher currentLocale={locale} />
      </div>
    </aside>
  )
}
