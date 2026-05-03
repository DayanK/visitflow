import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params are required' }, { status: 400 })
  }

  try {
    const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView')
    url.searchParams.set('startDateTime', start)
    url.searchParams.set('endDateTime', end)
    url.searchParams.set('$select', 'id,subject,organizer,start,end,location')
    url.searchParams.set('$top', '999')

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: err?.error?.message ?? response.statusText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
