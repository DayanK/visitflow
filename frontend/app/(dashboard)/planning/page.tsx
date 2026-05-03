import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PlanningClient } from './planning-client'
import type { GraphContact } from '@/types'

async function fetchContacts(accessToken: string): Promise<GraphContact[]> {
  try {
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/contacts?$top=999',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.value ?? []
  } catch {
    return []
  }
}

export default async function PlanningPage() {
  const session = await getServerSession(authOptions)
  const contacts = await fetchContacts(session!.accessToken)
  return <PlanningClient initialContacts={contacts} accessToken={session!.accessToken} />
}
