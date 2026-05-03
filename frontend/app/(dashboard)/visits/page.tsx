import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VisitsClient } from './visits-client'

function toInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function VisitsPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id ?? session!.user.email!

  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28)

  return (
    <VisitsClient
      userId={userId}
      initialStart={toInputValue(start)}
      initialEnd={toInputValue(end)}
      initialToday={toInputValue(now)}
    />
  )
}
