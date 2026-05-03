'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Users, AlertTriangle, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Visit, GraphContact } from '@/types'

interface Props {
  visits: Visit[]
  contacts: GraphContact[]
  today: string           // YYYY-MM-DD
  reminderThreshold?: number
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' })
}

export function PerformanceDashboard({ visits, contacts, today, reminderThreshold = 60 }: Props) {
  const t = useTranslations('performance')

  const todayMs = new Date(today + 'T12:00:00').getTime()

  // ─── Sales Evolution — last 12 months ────────────────────────────────────────
  const salesEvolution = useMemo(() => {
    const months: { key: string; label: string; visits: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(todayMs)
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = getMonthKey(d)
      months.push({ key, label: getMonthLabel(key), visits: 0 })
    }
    visits.forEach((v) => {
      if (!v.appointmentDate) return
      const key = getMonthKey(new Date(v.appointmentDate))
      const m = months.find((x) => x.key === key)
      if (m) m.visits++
    })
    return months
  }, [visits, todayMs])

  // ─── Active / Inactive contacts ───────────────────────────────────────────────
  const { active, inactive, donutData } = useMemo(() => {
    const recentPartners = new Set<string>()
    visits.forEach((v) => {
      if (!v.partner || !v.appointmentDate) return
      const days = Math.floor((todayMs - new Date(v.appointmentDate).getTime()) / 86_400_000)
      if (days <= reminderThreshold) recentPartners.add(v.partner.trim().toLowerCase())
    })
    let active = 0, inactive = 0
    contacts.forEach((c) => {
      const key = (c.displayName ?? '').trim().toLowerCase()
      if (recentPartners.has(key)) active++
      else inactive++
    })
    return {
      active,
      inactive,
      donutData: [
        { name: t('active'), value: active },
        { name: t('inactive'), value: inactive },
      ],
    }
  }, [visits, contacts, todayMs, reminderThreshold, t])

  // ─── At-Risk contacts ─────────────────────────────────────────────────────────
  const atRisk = useMemo(() => {
    const lastVisitDays = new Map<string, number>()
    visits.forEach((v) => {
      if (!v.partner || !v.appointmentDate) return
      const key = v.partner.trim().toLowerCase()
      const days = Math.floor((todayMs - new Date(v.appointmentDate).getTime()) / 86_400_000)
      const prev = lastVisitDays.get(key)
      if (prev === undefined || days < prev) lastVisitDays.set(key, days)
    })
    return contacts
      .map((c) => {
        const key = (c.displayName ?? '').trim().toLowerCase()
        const days = lastVisitDays.get(key)
        return days !== undefined && days > reminderThreshold
          ? { contact: c, days }
          : null
      })
      .filter((x): x is { contact: GraphContact; days: number } => x !== null)
      .sort((a, b) => b.days - a.days)
      .slice(0, 10)
  }, [visits, contacts, todayMs, reminderThreshold])

  const DONUT_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))']

  return (
    <div className="space-y-6">
      {/* ─── Sales Evolution ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" suppressHydrationWarning />
            {t('salesEvolution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
              {t('noData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={salesEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ─── Active / Inactive Donut ──────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4" suppressHydrationWarning />
              {t('activeClientsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                {t('noContacts')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-1">
                  <Badge variant="default" className="text-xs">{active} {t('active')}</Badge>
                  <Badge variant="secondary" className="text-xs">{inactive} {t('inactive')}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── At-Risk List ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" suppressHydrationWarning />
              {t('atRiskTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
                {t('noAtRisk')}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {atRisk.map(({ contact, days }) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contact.displayName}</p>
                      {contact.companyName && (
                        <p className="text-xs text-muted-foreground truncate">{contact.companyName}</p>
                      )}
                    </div>
                    <span className={cn(
                      'shrink-0 ml-2 text-xs font-medium px-2 py-0.5 rounded-full',
                      'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    )}>
                      {days}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
