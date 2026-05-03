'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { routePlanningApi, settingsApi, visitsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { ContactList } from '@/components/planning/ContactList'
import { ContactMap } from '@/components/planning/ContactMap'
import { PlanningDialog } from '@/components/planning/PlanningDialog'
import { CreateEventDialog } from '@/components/planning/CreateEventDialog'
import { ResultsView } from '@/components/planning/ResultsView'
import { Button } from '@/components/ui/button'
import { Route, Settings2, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import type { GraphContact, OptimizeResult, ContactCoordinate, Visit } from '@/types'

interface Props {
  accessToken: string
  initialContacts: GraphContact[]
}

export function PlanningClient({ accessToken, initialContacts }: Props) {
  const t = useTranslations('planning')
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userEmail = session?.user?.email ?? ''

  const { data: contacts = [], isFetching: isRefreshing, refetch: refreshContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: (): Promise<GraphContact[]> =>
      fetch('/api/graph/contacts').then((r) => r.json()).then((d) => d.value ?? []),
    initialData: initialContacts,
    staleTime: 30_000,
  })

  const invalidateContacts = () => queryClient.invalidateQueries({ queryKey: ['contacts'] })

  const { data: settingsData, isPending: settingsPending } = useQuery({
    queryKey: ['settings', userEmail],
    queryFn: () => settingsApi.getAll(userEmail),
    enabled: !!userEmail,
  })
  const hasSettings = !settingsPending && !!settingsData?.[0]
  const reminderThreshold = settingsData?.[0]?.reminderThreshold ?? 60

  const { data: visits = [] } = useQuery<Visit[]>({
    queryKey: ['visits', userEmail],
    queryFn: () => visitsApi.getAll(userEmail).then((r) => r as Visit[]),
    enabled: !!userEmail,
    staleTime: 5 * 60_000,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [coordinates, setCoordinates] = useState<ContactCoordinate[]>([])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selectedIds.has(c.id)),
    [contacts, selectedIds]
  )

  // ─── Selection helpers ───────────────────────────────────────────────────────
  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectIds = (ids: string[]) => {
    setSelectedIds((prev) => new Set([...prev, ...ids]))
  }

  const deselectIds = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  // ─── Geocode on mount ────────────────────────────────────────────────────────
  const { mutate: geocode, isPending: isGeocoding } = useMutation({
    mutationFn: async () => {
      const addressedContacts = contacts.filter((c) => {
        const a = c.businessAddress ?? c.homeAddress
        return !!(a?.street && a?.city)
      })
      const payload = addressedContacts.map((c) => {
        const a = c.businessAddress ?? c.homeAddress ?? {}
        return {
          Id: c.id,
          Street: a.street ?? '',
          City: a.city ?? '',
          Postalcode: a.postalCode ?? '',
          Country: a.countryOrRegion ?? '',
        }
      })
      return routePlanningApi.getContactCoordinates(payload) as Promise<ContactCoordinate[]>
    },
    onSuccess: setCoordinates,
  })

  const geocodedRef = useRef(false)
  useEffect(() => {
    if (geocodedRef.current || contacts.length === 0) return
    geocodedRef.current = true
    geocode()
  }, [contacts, geocode])

  // ─── Planning complete ───────────────────────────────────────────────────────
  // Do NOT overwrite `coordinates` here — the map re-uses the geocoded coords from
  // the initial load, and ResultsView reads coords from result.JobDispositions directly.
  const handlePlanningComplete = (optimizeResult: OptimizeResult) => {
    setResult(optimizeResult)
    setDialogOpen(false)
  }

  // ─── Settings guard ───────────────────────────────────────────────────────────
  if (!settingsPending && !hasSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
        <div className="rounded-full bg-muted p-5">
          <Settings2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-xl font-semibold">{t('noSettings.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('noSettings.description')}</p>
        </div>
        <Button asChild>
          <Link href="/settings">{t('noSettings.cta')}</Link>
        </Button>
      </div>
    )
  }

  // ─── Results view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ResultsView
        result={result}
        contacts={contacts}
        onBack={() => setResult(null)}
        accessToken={accessToken}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setEventDialogOpen(true)}
          >
            <CalendarPlus className="mr-2 h-4 w-4" suppressHydrationWarning />
            {t('newEvent')}
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={selectedContacts.length === 0}
            size="lg"
          >
            <Route className="mr-2 h-4 w-4" suppressHydrationWarning />
            {t('planRoute')}
            {selectedContacts.length > 0 && (
              <span className="ml-2 bg-primary-foreground/20 text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                {selectedContacts.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left panel — contact list */}
        <div className="w-[320px] shrink-0 min-h-0">
          <ContactList
            contacts={contacts}
            selectedIds={selectedIds}
            onToggle={toggle}
            onSelectIds={selectIds}
            onDeselectIds={deselectIds}
            onContactCreated={invalidateContacts}
            onRefresh={invalidateContacts}
            visits={visits}
            reminderThreshold={reminderThreshold}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Right panel — map */}
        <div className="flex-1 min-h-0">
          <ContactMap
            contacts={contacts}
            selectedIds={selectedIds}
            coordinates={coordinates}
            isLoading={isGeocoding}
            onToggle={toggle}
            onRadiusSelect={selectIds}
          />
        </div>
      </div>

      <PlanningDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedContacts={selectedContacts}
        accessToken={accessToken}
        onComplete={handlePlanningComplete}
      />

      <CreateEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        contacts={contacts}
        selectedIds={selectedIds}
      />
    </div>
  )
}
