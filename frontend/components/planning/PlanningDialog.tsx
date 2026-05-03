'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { routePlanningApi, settingsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Route } from 'lucide-react'
import { toast } from 'sonner'
import type { GraphContact, OptimizeResult, UserSettings } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedContacts: GraphContact[]
  accessToken: string
  onComplete: (result: OptimizeResult) => void
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function getAddress(contact: GraphContact) {
  return contact.businessAddress ?? contact.homeAddress ?? {}
}

export function PlanningDialog({ open, onOpenChange, selectedContacts, accessToken, onComplete }: Props) {
  const t  = useTranslations('planningDialog')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const userId = session?.user?.email ?? ''

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  useEffect(() => {
    const today = new Date()
    setStartDate(toDateInputValue(today))
    setEndDate(toDateInputValue(addDays(today, 6)))
  }, [])

  const [duration, setDuration]   = useState('60')
  const [rounding, setRounding]   = useState('0')
  const [roundtrip, setRoundtrip] = useState(false)

  const { data: settingsData } = useQuery({
    queryKey: ['settings', userId],
    queryFn: () => settingsApi.getAll(userId),
    enabled: !!userId && open,
  })

  const workerSettings: UserSettings | undefined = settingsData?.[0]

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!workerSettings) throw new Error(t('noSettings'))

      const jobs = selectedContacts.map((c) => {
        const addr = getAddress(c)
        return {
          Id: c.id,
          Duration: Number(duration),
          Street: addr.street ?? '',
          City: addr.city ?? '',
          Postalcode: addr.postalCode ?? '',
          Country: addr.countryOrRegion ?? '',
          Geocoordinates: null,
        }
      })

      const start = new Date(startDate)
      const end = new Date(endDate)
      const workingTimes: { Day: number; WorkingStartDate: string; WorkingEndDate: string }[] = []

      const current = new Date(start)
      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (workerSettings.workingDays.includes(dayOfWeek)) {
          const [startH, startM] = workerSettings.workingStartTime.split(':').map(Number)
          const [endH, endM] = workerSettings.workingEndTime.split(':').map(Number)
          const workStart = new Date(current)
          workStart.setHours(startH, startM, 0, 0)
          const workEnd = new Date(current)
          workEnd.setHours(endH, endM, 0, 0)
          workingTimes.push({
            Day: dayOfWeek,
            WorkingStartDate: workStart.toISOString(),
            WorkingEndDate: workEnd.toISOString(),
          })
        }
        current.setDate(current.getDate() + 1)
      }

      const worker = {
        WorkingTimes: workingTimes,
        Street: workerSettings.street,
        City: workerSettings.city,
        Postalcode: workerSettings.postalCode,
        Country: workerSettings.country,
        Geocoordinates: null,
      }

      const payload = {
        Jobs: jobs,
        JobDispositions: [],
        Workers: [worker],
        OptimizationParams: {
          PlanningPeriodStartDate: new Date(startDate).toISOString(),
          PlanningPeriodEndDate: new Date(endDate).toISOString(),
          Rounding: Number(rounding),
          Roundtrip: roundtrip,
        },
      }

      const result = await routePlanningApi.optimize(payload)
      return result as OptimizeResult
    },
    onSuccess: (optimizeResult) => {
      toast.success('Route optimized successfully!')
      onComplete(optimizeResult)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const count = selectedContacts.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4" suppressHydrationWarning />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {count === 1 ? t('description', { count }) : t('descriptionPlural', { count })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!workerSettings && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              {t('noSettings')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{t('endDate')}</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('visitDuration')}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['15','30','45','60','90','120'] as const).map((v) => (
                    <SelectItem key={v} value={v}>{t(`durations.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('timeRounding')}</Label>
              <Select value={rounding} onValueChange={setRounding}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['0','5','10','15','30'] as const).map((v) => (
                    <SelectItem key={v} value={v}>{t(`roundings.${v}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="roundtrip"
              checked={roundtrip}
              onCheckedChange={(v) => setRoundtrip(v === true)}
            />
            <Label htmlFor="roundtrip" className="cursor-pointer font-normal">{t('roundtrip')}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={optimizeMutation.isPending}>
            {tc('cancel')}
          </Button>
          <Button onClick={() => optimizeMutation.mutate()} disabled={optimizeMutation.isPending}>
            {optimizeMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />{t('optimizing')}</>
            ) : (
              <><Route className="mr-2 h-4 w-4" suppressHydrationWarning />{t('optimize')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
