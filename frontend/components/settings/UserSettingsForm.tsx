'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { settingsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, MapPin, Clock, Calendar, Bell } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { UserSettings } from '@/types'

const schema = z.object({
  street:              z.string().min(1),
  postalCode:          z.string().min(1),
  city:                z.string().min(1),
  country:             z.string().min(1),
  workingStartTime:    z.string().min(1),
  workingEndTime:      z.string().min(1),
  workingDays:         z.array(z.number()).min(1),
  calendarName:        z.string().optional(),
  dynamicsUrl:         z.string().optional(),
  reminderThreshold:   z.number().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props { userId: string; username: string }

export function UserSettingsForm({ userId, username }: Props) {
  const t  = useTranslations('settings')
  const tc = useTranslations('common')
  const queryClient = useQueryClient()

  const { data: settingsData, isPending: isLoading } = useQuery({
    queryKey: ['settings', username],
    queryFn: () => settingsApi.getAll(username),
    enabled: !!username,
  })

  const existing: UserSettings | undefined = settingsData?.[0]

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      street: '', postalCode: '', city: '', country: '',
      workingStartTime: '08:00', workingEndTime: '17:00',
      workingDays: [1, 2, 3, 4, 5],
      calendarName: '', dynamicsUrl: '',
      reminderThreshold: 60,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        street: existing.street,
        postalCode: existing.postalCode,
        city: existing.city,
        country: existing.country,
        workingStartTime: existing.workingStartTime,
        workingEndTime: existing.workingEndTime,
        workingDays: existing.workingDays ?? [1, 2, 3, 4, 5],
        calendarName: existing.calendarName ?? '',
        dynamicsUrl: existing.dynamicsUrl ?? '',
        reminderThreshold: existing.reminderThreshold ?? 60,
      })
    }
  }, [existing, reset])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const settings: UserSettings = {
        username,
        ...values,
        calendarName: values.calendarName || undefined,
        dynamicsUrl: values.dynamicsUrl || undefined,
        reminderThreshold: values.reminderThreshold,
      }
      return settingsApi.save([settings])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', username] })
      toast.success(t('saved'))
      reset(undefined, { keepValues: true })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" suppressHydrationWarning />
      </div>
    )
  }

  const DAY_KEYS = ['0','1','2','3','4','5','6'] as const

  return (
    <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6 max-w-2xl">
      {/* Start address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" suppressHydrationWarning />
            {t('address.title')}
          </CardTitle>
          <CardDescription>{t('address.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="street">{t('address.street')} *</Label>
            <Input id="street" {...register('street')} placeholder={t('address.streetPlaceholder')} />
            {errors.street && <p className="text-xs text-destructive">{t('address.streetRequired')}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">{t('address.postalCode')} *</Label>
              <Input id="postalCode" {...register('postalCode')} placeholder={t('address.postalCodePlaceholder')} />
              {errors.postalCode && <p className="text-xs text-destructive">{t('address.postalCodeRequired')}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="city">{t('address.city')} *</Label>
              <Input id="city" {...register('city')} placeholder={t('address.cityPlaceholder')} />
              {errors.city && <p className="text-xs text-destructive">{t('address.cityRequired')}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">{t('address.country')} *</Label>
            <Input id="country" {...register('country')} placeholder={t('address.countryPlaceholder')} />
            {errors.country && <p className="text-xs text-destructive">{t('address.countryRequired')}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Working hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" suppressHydrationWarning />
            {t('hours.title')}
          </CardTitle>
          <CardDescription>{t('hours.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="workingStartTime">{t('hours.startTime')} *</Label>
              <Input id="workingStartTime" type="time" {...register('workingStartTime')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workingEndTime">{t('hours.endTime')} *</Label>
              <Input id="workingEndTime" type="time" {...register('workingEndTime')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('hours.workingDays')} *</Label>
            <Controller
              control={control}
              name="workingDays"
              render={({ field }) => (
                <div className="flex gap-2">
                  {DAY_KEYS.map((key) => {
                    const idx = Number(key)
                    const checked = field.value.includes(idx)
                    return (
                      <label key={idx} className="flex flex-col items-center gap-1 cursor-pointer select-none">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                            checked
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                          onClick={() => {
                            const next = checked
                              ? field.value.filter((d) => d !== idx)
                              : [...field.value, idx].sort()
                            field.onChange(next)
                          }}
                        >
                          {t(`days.${key}`)}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            />
            {errors.workingDays && (
              <p className="text-xs text-destructive">{t('hours.daysRequired')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" suppressHydrationWarning />
            {t('integrations.title')}
          </CardTitle>
          <CardDescription>{t('integrations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="calendarName">{t('integrations.calendarName')}</Label>
            <Input id="calendarName" {...register('calendarName')} placeholder={t('integrations.calendarPlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dynamicsUrl">{t('integrations.dynamicsUrl')}</Label>
            <Input id="dynamicsUrl" {...register('dynamicsUrl')} placeholder={t('integrations.dynamicsPlaceholder')} />
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" suppressHydrationWarning />
            {t('reminders.title')}
          </CardTitle>
          <CardDescription>{t('reminders.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>{t('reminders.threshold')}</Label>
            <Controller
              control={control}
              name="reminderThreshold"
              render={({ field }) => (
                <Select
                  value={String(field.value ?? 60)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t('reminders.days30')}</SelectItem>
                    <SelectItem value="60">{t('reminders.days60')}</SelectItem>
                    <SelectItem value="90">{t('reminders.days90')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
          {saveMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />{tc('saving')}</>
          ) : (
            <><Save className="mr-2 h-4 w-4" suppressHydrationWarning />{t('saveButton')}</>
          )}
        </Button>
      </div>
    </form>
  )
}
