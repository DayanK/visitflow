import { UserNav } from './UserNav'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b flex items-center justify-between px-6 shrink-0 bg-card">
      <div />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserNav user={user} />
      </div>
    </header>
  )
}
