'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Clock, MapPin, AlertTriangle, CalendarPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatTime } from '@/lib/utils'
import { loadAtlasSDK } from '@/lib/atlas'
import type { OptimizeResult, GraphContact, IJobDisposition } from '@/types'
import { isVisitStop, isHomeOrTransit, UNDISPATCHABLE_REASON_LABELS } from '@/types'

interface Props {
  result: OptimizeResult
  contacts: GraphContact[]
  onBack: () => void
  accessToken: string
}

const DAY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
]

function groupByDay(dispositions: IJobDisposition[]): Map<string, IJobDisposition[]> {
  const map = new Map<string, IJobDisposition[]>()
  for (const d of dispositions) {
    const day = d.StartDate.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(d)
  }
  return map
}

async function saveVisitsToCalendar(
  dispositions: IJobDisposition[],
  contacts: GraphContact[],
  accessToken: string
): Promise<number> {
  const visits = dispositions.filter((d) => isVisitStop(d.Job.Type))

  const events = visits.map((d) => {
    const contact = contacts.find((c) => c.id === (d.Job.ReferenceId || d.Job.Id))
    const addr = contact?.businessAddress ?? contact?.homeAddress
    const location = addr
      ? [addr.street, addr.postalCode, addr.city, addr.countryOrRegion].filter(Boolean).join(', ')
      : ''
    const phone = contact?.mobilePhone ?? contact?.businessPhones?.[0] ?? ''
    const email = contact?.emailAddresses?.[0]?.address ?? ''
    const notes = [phone && `Tel: ${phone}`, email && `Email: ${email}`].filter(Boolean).join('\n')

    return {
      subject: `Visit – ${contact?.displayName ?? 'Contact'}`,
      start: { dateTime: d.StartDate, timeZone: 'Europe/Berlin' },
      end: { dateTime: d.EndDate, timeZone: 'Europe/Berlin' },
      ...(location && { location: { displayName: location } }),
      ...(notes && { body: { contentType: 'text', content: notes } }),
    }
  })

  // $batch supports max 20 requests — send in chunks
  let created = 0
  for (let i = 0; i < events.length; i += 20) {
    const chunk = events.slice(i, i + 20)
    const requests = chunk.map((body, idx) => ({
      id: String(idx + 1),
      method: 'POST',
      url: '/me/events',
      headers: { 'Content-Type': 'application/json' },
      body,
    }))
    const res = await fetch('https://graph.microsoft.com/v1.0/$batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    })
    if (!res.ok) throw new Error(`Batch failed: ${res.statusText}`)
    const data = await res.json()
    created += (data.responses as { status: number }[]).filter((r) => r.status === 201).length
  }
  return created
}

export function ResultsView({ result, contacts, onBack, accessToken }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const atlasMapRef = useRef<unknown>(null)
  const [savingCalendar, setSavingCalendar] = useState(false)
  const [calendarSaved, setCalendarSaved] = useState(false)

  const handleSaveToCalendar = async () => {
    setSavingCalendar(true)
    try {
      const count = await saveVisitsToCalendar(result.JobDispositions, contacts, accessToken)
      setCalendarSaved(true)
      toast.success(`${count} appointment${count !== 1 ? 's' : ''} saved to your calendar`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save to calendar')
    } finally {
      setSavingCalendar(false)
    }
  }

  const byDay = useMemo(() => groupByDay(result.JobDispositions), [result])
  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay])

  const visitCount = result.JobDispositions.filter((d) => isVisitStop(d.Job.Type)).length
  const notDispatchable = result.NotDispatchableJobs?.length ?? 0

  function getContactName(id: string): string {
    const c = contacts.find((co) => co.id === id)
    return c?.displayName ?? id
  }

  // Build Azure Maps visualization
  useEffect(() => {
    if (!mapRef.current || result.JobDispositions.length === 0) return

    const AZURE_MAPS_KEY = process.env.NEXT_PUBLIC_AZURE_MAPS_KEY
    if (!AZURE_MAPS_KEY) return

    const loadMap = async () => {
      await loadAtlasSDK()

      const atlas = (window as unknown as { atlas: typeof import('azure-maps-control') }).atlas

      if (atlasMapRef.current) {
        (atlasMapRef.current as { dispose: () => void }).dispose()
      }

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      const map = new atlas.Map(mapRef.current!, {
        authOptions: {
          authType: atlas.AuthenticationType.subscriptionKey,
          subscriptionKey: AZURE_MAPS_KEY,
        },
        zoom: 10,
        language: 'en-US',
        style: isDark ? 'night' : 'road',
      })

      map.events.add('ready', () => {
        // Controls
        map.controls.add(
          [
            new atlas.control.ZoomControl(),
            new atlas.control.CompassControl(),
            new atlas.control.StyleControl({
              mapStyles: [
                'road',
                'night',
                'grayscale_light',
                'grayscale_dark',
                'satellite_road_labels',
              ],
            }),
          ],
          { position: atlas.ControlPosition.TopRight }
        )
        map.controls.add(new atlas.control.ScaleControl(), { position: atlas.ControlPosition.BottomRight })

        let stopIndex = 0
        const allPositions: [number, number][] = []

        days.forEach((day, dayIdx) => {
          const dayDisps = byDay.get(day) ?? []
          const color = DAY_COLORS[dayIdx % DAY_COLORS.length]
          const routeSource = new atlas.source.DataSource()
          map.sources.add(routeSource)

          const routePoints: [number, number][] = []

          dayDisps.forEach((d) => {
            if (!d.Job.Coordinates) return
            const { Longitude, Latitude } = d.Job.Coordinates
            if (!Latitude || !Longitude) return

            const pos: [number, number] = [Longitude, Latitude]
            routePoints.push(pos)
            allPositions.push(pos)

            if (isVisitStop(d.Job.Type)) {
              stopIndex++
              // Native Azure Maps pin with day colour + visit order number
              const marker = new atlas.HtmlMarker({
                position: pos,
                color,
                text: String(stopIndex),
              })
              map.markers.add(marker)
            }
          })

          if (routePoints.length >= 2) {
            routeSource.add(
              new atlas.data.Feature(new atlas.data.LineString(routePoints))
            )
            map.layers.add(
              new atlas.layer.LineLayer(routeSource, undefined, {
                strokeColor: color,
                strokeWidth: 3,
                strokeOpacity: 0.85,
              })
            )
          }
        })

        if (allPositions.length > 0) {
          const bounds = atlas.data.BoundingBox.fromPositions(allPositions)
          map.setCamera({ bounds, padding: 60 })
        }
      })

      atlasMapRef.current = map
    }

    loadMap().catch(() => {})

    return () => {
      if (atlasMapRef.current) {
        ;(atlasMapRef.current as { dispose: () => void }).dispose()
        atlasMapRef.current = null
      }
    }
  }, [result, days, byDay])

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Optimized Route</h1>
              <p className="text-sm text-muted-foreground">
                {visitCount} visit{visitCount !== 1 ? 's' : ''} across {days.length} day{days.length !== 1 ? 's' : ''}
                {notDispatchable > 0 && ` · ${notDispatchable} unscheduled`}
              </p>
            </div>
          </div>

          <Button
            variant={calendarSaved ? 'secondary' : 'outline'}
            size="sm"
            onClick={handleSaveToCalendar}
            disabled={savingCalendar || calendarSaved}
          >
            {savingCalendar ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Saving…</>
            ) : calendarSaved ? (
              <><CheckCircle2 className="mr-2 h-3.5 w-3.5 text-green-500" />Saved to Calendar</>
            ) : (
              <><CalendarPlus className="mr-2 h-3.5 w-3.5" />Save to Calendar</>
            )}
          </Button>
        </div>

        {/* Day colour legend — always visible */}
        {days.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap pl-12">
            {days.map((day, i) => (
              <div key={day} className="flex items-center gap-1.5 text-sm">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }}
                />
                <span className="text-muted-foreground">{formatDate(day)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Route list */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {notDispatchable > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium mb-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {notDispatchable} contact{notDispatchable !== 1 ? 's' : ''} not scheduled
              </div>
              <ul className="space-y-0.5 pl-6 list-disc">
                {result.NotDispatchableJobs.map((u, i) => (
                  <li key={i} className="text-xs">
                    {getContactName(u.Job.ReferenceId || u.Job.Id)}
                    {' — '}
                    <span className="opacity-75">{UNDISPATCHABLE_REASON_LABELS[u.Reason] ?? 'Unknown'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ScrollArea className="flex-1 rounded-lg border">
            <div className="p-3 space-y-4">
              {days.map((day, dayIdx) => {
                const dayDisps = (byDay.get(day) ?? []).filter((d) => isVisitStop(d.Job.Type))
                const color = DAY_COLORS[dayIdx % DAY_COLORS.length]
                return (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold">{formatDate(day)}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {dayDisps.length} stop{dayDisps.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-1 pl-4">
                      {dayDisps.map((d, i) => (
                        <div key={`${day}-${i}`} className="flex items-start gap-2 py-1.5">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                            style={{ backgroundColor: color }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getContactName(d.Job.ReferenceId || d.Job.Id)}</p>
                            {(() => {
                              const c = contacts.find(co => co.id === (d.Job.ReferenceId || d.Job.Id))
                              const sub = [c?.jobTitle, c?.companyName].filter(Boolean).join(' · ')
                              return sub ? <p className="text-xs text-muted-foreground truncate">{sub}</p> : null
                            })()}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatTime(d.StartDate)} – {formatTime(d.EndDate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {dayIdx < days.length - 1 && <Separator className="mt-3" />}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[400px] rounded-lg border overflow-hidden bg-muted">
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}
