'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { visitsApi } from '@/lib/api'
import { VisitForm } from './VisitForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ICalendarWeek, ICalendarItem, Visit } from '@/types'

interface Props {
  weeks: ICalendarWeek[]
  visits: Visit[]
  userId: string
}

interface Prefill {
  appointmentId?: string
  subject?: string
  partner?: string
  appointmentDate?: string
  visitTime?: string
}

function getVisitForEvent(visits: Visit[], appointmentId: string): Visit | undefined {
  return visits.find((v) => v.appointmentId === appointmentId)
}

function missingCount(items: ICalendarItem[], visits: Visit[]): number {
  return items.filter((item) => !getVisitForEvent(visits, item.appointmentId)).length
}

export function VisitCalendarView({ weeks, visits, userId }: Props) {
  const t  = useTranslations('visits')
  const to = useTranslations('outcomes')
  const tv = useTranslations('visitTypes')

  const queryClient = useQueryClient()
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    () => new Set(weeks.slice(0, 3).map((w) => w.weekKey))
  )
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  const [prefill, setPrefill] = useState<Prefill | null>(null)

  const toggleWeek = (key: string) =>
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const toggleDay = (key: string) =>
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const openCreate = (item: ICalendarItem) => {
    setEditingVisit(null)
    setPrefill({
      appointmentId: item.appointmentId,
      subject: item.subject,
      partner: item.location || '',
      appointmentDate: item.isoDate,
      visitTime: item.timeStart,
    })
    setFormOpen(true)
  }

  const openEdit = (visit: Visit) => {
    setEditingVisit(visit)
    setPrefill(null)
    setFormOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<Visit> & { appointmentId?: string }) =>
      visitsApi.create({ ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success(t('createSuccess'))
      setFormOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Visit> & { appointmentId?: string }) =>
      visitsApi.update({ ...data, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success(t('updateSuccess'))
      setEditingVisit(null)
      setFormOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (visit: Visit) => visitsApi.delete(visit.appointmentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', userId] })
      toast.success(t('deleteSuccess'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSave = (values: Partial<Visit> & { appointmentId?: string }) => {
    if (editingVisit) {
      updateMutation.mutate({ ...values, appointmentId: editingVisit.appointmentId })
    } else {
      createMutation.mutate(values)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" suppressHydrationWarning />
        <p className="text-sm">{t('noEvents')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {weeks.map((week) => {
          const weekExpanded = expandedWeeks.has(week.weekKey)
          const allItems = week.days.flatMap((d) => d.items)
          const missing = missingCount(allItems, visits)
          const hasMissing = missing > 0

          return (
            <div key={week.weekKey} className="rounded-lg border bg-card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
                onClick={() => toggleWeek(week.weekKey)}
              >
                {weekExpanded
                  ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" suppressHydrationWarning />
                  : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" suppressHydrationWarning />}
                <span className="font-semibold text-sm flex-1">{week.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {week.totalEvents === 1 ? t('appointments', { count: week.totalEvents }) : t('appointmentsPlural', { count: week.totalEvents })}
                  </Badge>
                  {hasMissing && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                      <AlertTriangle className="h-3 w-3 mr-1" suppressHydrationWarning />
                      {t('missing', { count: missing })}
                    </Badge>
                  )}
                  {!hasMissing && week.totalEvents > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" suppressHydrationWarning />
                      {t('allDone')}
                    </Badge>
                  )}
                </div>
              </button>

              {weekExpanded && (
                <div className="border-t divide-y">
                  {week.days.map((day) => {
                    const dayKey = `${week.weekKey}-${day.isoDate}`
                    const dayExpanded = expandedDays.has(dayKey)
                    const dayMissing = missingCount(day.items, visits)

                    return (
                      <div key={day.isoDate}>
                        <button
                          className="w-full flex items-center gap-3 px-6 py-2.5 text-left hover:bg-accent/30 transition-colors"
                          onClick={() => toggleDay(dayKey)}
                        >
                          {dayExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" suppressHydrationWarning />
                            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" suppressHydrationWarning />}
                          <span className="text-sm font-medium flex-1">{day.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {day.items.length === 1 ? t('appointments', { count: day.items.length }) : t('appointmentsPlural', { count: day.items.length })}
                            </span>
                            {dayMissing > 0 && (
                              <span className="text-xs text-amber-600 font-medium">
                                · {t('missing', { count: dayMissing })}
                              </span>
                            )}
                          </div>
                        </button>

                        {dayExpanded && (
                          <div className="divide-y bg-muted/20">
                            {day.items.map((item) => {
                              const existingVisit = getVisitForEvent(visits, item.appointmentId)
                              const hasReport = !!existingVisit

                              return (
                                <div key={item.appointmentId} className="flex items-center gap-4 px-8 py-3">
                                  <div className="shrink-0">
                                    {hasReport
                                      ? <CheckCircle2 className="h-4 w-4 text-green-500" suppressHydrationWarning />
                                      : <div className="h-4 w-4 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30" />}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                                        {item.timeStart} – {item.timeEnd}
                                      </span>
                                      <span className="text-sm font-medium truncate">{item.subject}</span>
                                    </div>
                                    {item.location && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {[item.location, item.street, item.postalCode, item.city].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                    {hasReport && (existingVisit.outcome || existingVisit.visitType) && (
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        {existingVisit.visitType && (
                                          <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                            {tv(existingVisit.visitType as keyof typeof tv)}
                                          </span>
                                        )}
                                        {existingVisit.outcome && (
                                          <span className="text-xs text-muted-foreground">
                                            {to(existingVisit.outcome as keyof typeof to)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {hasReport && existingVisit.note && (
                                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5 italic">
                                        {existingVisit.note}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0">
                                    {hasReport ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <MoreHorizontal className="h-3.5 w-3.5" suppressHydrationWarning />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEdit(existingVisit)}>
                                            <Pencil className="mr-2 h-3.5 w-3.5" suppressHydrationWarning />
                                            {t('editReport')}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => deleteMutation.mutate(existingVisit)}
                                          >
                                            <Trash2 className="mr-2 h-3.5 w-3.5" suppressHydrationWarning />
                                            {t('deleteReport')}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => openCreate(item)}
                                      >
                                        <Plus className="h-3 w-3" suppressHydrationWarning />
                                        {t('report')}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <VisitForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) { setEditingVisit(null); setPrefill(null) }
        }}
        visit={editingVisit}
        prefill={prefill}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  )
}
