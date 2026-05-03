'use client'

import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { GraphContact } from '@/types'

const schema = z.object({
  subject:   z.string().min(1),
  date:      z.string().min(1),
  startTime: z.string().min(1),
  endTime:   z.string().min(1),
  contactId: z.string().optional(),
  location:  z.string().optional(),
  notes:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: GraphContact[]
  selectedIds: Set<string>
}

function getContactAddress(c: GraphContact): string {
  const a = c.businessAddress ?? c.homeAddress
  if (!a) return ''
  return [a.street, a.postalCode, a.city].filter(Boolean).join(', ')
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CreateEventDialog({ open, onOpenChange, contacts, selectedIds }: Props) {
  const t  = useTranslations('createEvent')
  const tc = useTranslations('common')
  const router = useRouter()

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '', date: '', startTime: '09:00', endTime: '10:00',
      contactId: '', location: '', notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        subject: '', date: toDateInputValue(new Date()),
        startTime: '09:00', endTime: '10:00',
        contactId: '', location: '', notes: '',
      })
    }
  }, [open, reset])

  // pre-fill location when a contact is selected
  const contactId = watch('contactId')
  useEffect(() => {
    if (!contactId) return
    const c = contacts.find((x) => x.id === contactId)
    if (c) {
      const addr = getContactAddress(c)
      if (addr) setValue('location', addr)
      if (!watch('subject') && c.displayName) {
        setValue('subject', `Visit — ${c.displayName}`)
      }
    }
  }, [contactId, contacts, setValue, watch])

  // selected contacts first, then the rest
  const sortedContacts = useMemo(() => {
    const sel = contacts.filter((c) => selectedIds.has(c.id))
    const rest = contacts.filter((c) => !selectedIds.has(c.id))
    return [...sel, ...rest]
  }, [contacts, selectedIds])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const startISO = `${values.date}T${values.startTime}:00`
      const endISO   = `${values.date}T${values.endTime}:00`

      const body: Record<string, unknown> = {
        subject: values.subject,
        start: { dateTime: startISO, timeZone: 'UTC' },
        end:   { dateTime: endISO,   timeZone: 'UTC' },
      }
      if (values.location) {
        body.location = { displayName: values.location }
      }
      if (values.notes) {
        body.body = { contentType: 'text', content: values.notes }
      }

      const res = await fetch('/api/graph/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? res.statusText)
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t('success'), {
        action: { label: t('goToVisits'), onClick: () => router.push('/visits') },
      })
      onOpenChange(false)
      router.refresh()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" suppressHydrationWarning />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('title')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 py-1">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-subject">{t('subject')} *</Label>
            <Input id="ce-subject" {...register('subject')} placeholder={t('subjectPlaceholder')} />
            {errors.subject && <p className="text-xs text-destructive">{t('subjectRequired')}</p>}
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-date">{t('date')} *</Label>
              <Input id="ce-date" type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-destructive">{t('dateRequired')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-start">{t('startTime')}</Label>
              <Input id="ce-start" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-end">{t('endTime')}</Label>
              <Input id="ce-end" type="time" {...register('endTime')} />
            </div>
          </div>

          {/* Contact picker */}
          <div className="space-y-1.5">
            <Label>{t('contact')}</Label>
            <Controller
              control={control}
              name="contactId"
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contactPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('contactPlaceholder')}</SelectItem>
                    {sortedContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.displayName ?? c.id}
                        {c.companyName ? ` · ${c.companyName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-location">{t('location')}</Label>
            <Input id="ce-location" {...register('location')} placeholder={t('locationPlaceholder')} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ce-notes">{t('notes')}</Label>
            <Textarea id="ce-notes" {...register('notes')} placeholder={t('notesPlaceholder')} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />{tc('saving')}</>
                : <><CalendarPlus className="mr-2 h-4 w-4" suppressHydrationWarning />{t('createButton')}</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
