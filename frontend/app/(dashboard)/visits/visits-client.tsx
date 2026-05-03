'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { visitsApi } from '@/lib/api'
import { processCalendarEvents } from '@/lib/utils'
import { VisitCalendarView } from '@/components/visits/VisitCalendarView'
import { VisitDashboard } from '@/components/visits/VisitDashboard'
import { PerformanceDashboard } from '@/components/visits/PerformanceDashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { settingsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import type { Visit, ICalendarEvent, GraphContact } from '@/types'

interface Props {
  userId: string
  initialStart: string
  initialEnd: string
  initialToday: string
}

async function fetchCalendarEvents(start: Date, end: Date): Promise<ICalendarEvent[]> {
  const url = new URL('/api/graph/calendar', window.location.origin)
  url.searchParams.set('start', start.toISOString())
  url.searchParams.set('end', end.toISOString())

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return (data.value ?? []) as ICalendarEvent[]
}

function parseInputDate(s: string, endOfDay = false): Date {
  return new Date(s + (endOfDay ? 'T23:59:59' : 'T00:00:00'))
}

export function VisitsClient({ userId, initialStart, initialEnd, initialToday }: Props) {
  const t  = useTranslations('visits')
  const tp = useTranslations('performance')
  const { data: session } = useSession()
  const userEmail = session?.user?.email ?? userId

  const [startInput, setStartInput] = useState(initialStart)
  const [endInput,   setEndInput]   = useState(initialEnd)
  const [startDate, setStartDate]   = useState(() => parseInputDate(initialStart))
  const [endDate,   setEndDate]     = useState(() => parseInputDate(initialEnd, true))

  const {
    data: calendarEvents = [],
    isPending: calPending,
    isError: calIsError,
    error: calError,
  } = useQuery({
    queryKey: ['calendar-events', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => fetchCalendarEvents(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: visits = [], isPending: visitsPending } = useQuery({
    queryKey: ['visits', userId],
    queryFn: () => visitsApi.getAll(userId).then((r) => r as Visit[]),
    enabled: !!userId,
  })

  const { data: contacts = [] } = useQuery<GraphContact[]>({
    queryKey: ['contacts'],
    queryFn: (): Promise<GraphContact[]> =>
      fetch('/api/graph/contacts').then((r) => r.json()).then((d) => d.value ?? []),
    staleTime: 10 * 60_000,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => settingsApi.getAll(userEmail),
    enabled: !!userEmail,
  })
  const reminderThreshold = settingsData?.[0]?.reminderThreshold ?? 60

  const isLoading = calPending || visitsPending
  const weeks = processCalendarEvents(calendarEvents, startDate, endDate)

  function applyRange() {
    const s = new Date(startInput + 'T00:00:00')
    const e = new Date(endInput   + 'T23:59:59')
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return
    setStartDate(s)
    setEndDate(e)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('subtitle')}</p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">{t('from')}</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('to')}</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={applyRange} disabled={isLoading}>
            <RefreshCw className="h-3.5 w-3.5" suppressHydrationWarning />
            {t('load')}
          </Button>
        </div>
      </div>

      {calIsError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" suppressHydrationWarning />
          <span>{t('calendarError', { message: (calError as Error)?.message ?? 'Unknown error' })}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" suppressHydrationWarning />
        </div>
      ) : (
        <Tabs defaultValue="calendar">
          <TabsList className="mb-4">
            <TabsTrigger value="calendar">{t('tabCalendar')}</TabsTrigger>
            <TabsTrigger value="dashboard">{t('tabDashboard')}</TabsTrigger>
            <TabsTrigger value="performance">{tp('tabLabel')}</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <VisitCalendarView weeks={weeks} visits={visits} userId={userId} />
          </TabsContent>

          <TabsContent value="dashboard">
            <VisitDashboard visits={visits} calendarEvents={calendarEvents} today={initialToday} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceDashboard
              visits={visits}
              contacts={contacts}
              today={initialToday}
              reminderThreshold={reminderThreshold}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
