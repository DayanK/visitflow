'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { ClipboardList, TrendingUp, Users, Calendar, Download } from 'lucide-react'
import { cn, exportVisitsCsv } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { OUTCOME_VALUES, VISIT_TYPE_VALUES } from '@/components/visits/VisitForm'
import type { Visit, ICalendarEvent } from '@/types'

interface Props {
  visits: Visit[]
  calendarEvents: ICalendarEvent[]
  today: string  // YYYY-MM-DD from server — avoids new Date() hydration mismatch
}

interface KpiProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}

function KpiCard({ label, value, sub, icon: Icon, accent }: KpiProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 flex flex-col gap-1',
      accent && 'border-primary/30 bg-primary/5'
    )}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#60a5fa', '#34d399', '#fbbf24',
  '#f87171', '#fb923c', '#e879f9', '#2dd4bf',
  '#a3e635', '#facc15', '#f472b6', '#94a3b8',
  '#64748b', '#475569',
]

function getISOWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function VisitDashboard({ visits, calendarEvents, today }: Props) {
  const t  = useTranslations('dashboard')
  const tv_visits = useTranslations('visits')
  const to = useTranslations('outcomes')
  const tv = useTranslations('visitTypes')

  const hasAnything = visits.length > 0 || calendarEvents.length > 0

  const visitsPerWeek = useMemo(() => {
    const now = new Date(today + 'T12:00:00') // noon — avoids UTC midnight edge cases
    const weeks: { key: string; label: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = getISOWeekKey(d)
      weeks.push({ key, label: `W${key.split('-W')[1]}`, count: 0 })
    }
    const keySet = new Set(weeks.map((w) => w.key))
    visits.forEach((v) => {
      const key = getISOWeekKey(new Date(v.appointmentDate))
      const w = weeks.find((x) => x.key === key)
      if (w) w.count++
    })
    return weeks.filter((w) => keySet.has(w.key))
  }, [visits])

  const outcomeData = useMemo(() => {
    const counts: Record<string, number> = {}
    visits.forEach((v) => {
      if (v.outcome) counts[v.outcome] = (counts[v.outcome] ?? 0) + 1
    })
    return OUTCOME_VALUES
      .filter((k) => counts[k])
      .map((k) => ({ name: to(k), value: counts[k] }))
  }, [visits, to])

  const visitTypeData = useMemo(() => {
    const counts: Record<string, number> = {}
    visits.forEach((v) => {
      if (v.visitType) counts[v.visitType] = (counts[v.visitType] ?? 0) + 1
    })
    return VISIT_TYPE_VALUES
      .filter((k) => counts[k])
      .map((k) => ({ name: tv(k), value: counts[k] }))
  }, [visits, tv])

  const coverageRate = useMemo(() => {
    if (calendarEvents.length === 0) return null
    const filled = calendarEvents.filter((e) =>
      visits.some((v) => v.appointmentId === e.id)
    ).length
    return Math.round((filled / calendarEvents.length) * 100)
  }, [visits, calendarEvents])

  const mostVisitedPartner = useMemo(() => {
    const counts: Record<string, number> = {}
    visits.forEach((v) => {
      if (v.partner) counts[v.partner] = (counts[v.partner] ?? 0) + 1
    })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : '—'
  }, [visits])

  const avgPerWeek = useMemo(() => {
    const filled = visitsPerWeek.filter((w) => w.count > 0)
    if (filled.length === 0) return 0
    const total = visitsPerWeek.reduce((s, w) => s + w.count, 0)
    return (total / 12).toFixed(1)
  }, [visitsPerWeek])

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" suppressHydrationWarning />
        <p className="text-sm">{t('noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
        <KpiCard label={t('totalVisits')} value={visits.length} icon={ClipboardList} accent />
        <KpiCard
          label={t('coverageRate')}
          value={coverageRate !== null ? `${coverageRate}%` : '—'}
          sub={t('coverageDesc')}
          icon={Calendar}
        />
        <KpiCard label={t('mostVisited')} value={mostVisitedPartner} icon={Users} />
        <KpiCard label={t('avgPerWeek')} value={avgPerWeek} icon={TrendingUp} />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => exportVisitsCsv(visits)}
          disabled={visits.length === 0}
        >
          <Download className="mr-2 h-3.5 w-3.5" suppressHydrationWarning />
          {tv_visits('exportCsv')}
        </Button>
      </div>

      {/* Visits per week */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-semibold mb-3">
          {t('visitsPerWeek')}
          <span className="text-xs text-muted-foreground font-normal ml-1">({t('last12weeks')})</span>
        </p>
        {visits.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
            {t('noReportsYet')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={visitsPerWeek} barSize={14}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                cursor={{ fill: 'hsl(var(--accent))' }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Outcome breakdown */}
        {outcomeData.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold mb-3">{t('outcomeBreakdown')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {outcomeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Visit type breakdown */}
        {visitTypeData.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold mb-3">{t('visitTypeBreakdown')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={visitTypeData} layout="vertical" barSize={14}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: 'hsl(var(--accent))' }} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {visitTypeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
