'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Visit } from '@/types'

// ─── Static option keys (values stay unchanged — stored in DB) ────────────────
export const OUTCOME_VALUES = ['0','100','110','200','300','400','500','600','700','800','900','1000','1100','1200','1300','1400','1500','1600'] as const
export const VISIT_TYPE_VALUES = ['0','1','2','3','4'] as const

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  subject:         z.string().min(1),
  partner:         z.string().optional(),
  outcome:         z.string().optional(),
  visitType:       z.string().optional(),
  appointmentDate: z.string().min(1),
  visitTime:       z.string().optional(),
  note:            z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Prefill {
  appointmentId?: string
  subject?: string
  partner?: string
  appointmentDate?: string
  visitTime?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  visit?: Visit | null
  prefill?: Prefill | null
  onSave: (values: FormValues & { appointmentId?: string }) => void
  isSaving: boolean
}

export function VisitForm({ open, onOpenChange, visit, prefill, onSave, isSaving }: Props) {
  const t  = useTranslations('visitForm')
  const tc = useTranslations('common')
  const to = useTranslations('outcomes')
  const tv = useTranslations('visitTypes')

  const isEdit = !!visit
  const hasCalendarPrefill = !isEdit && !!prefill?.appointmentDate

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '', partner: '', outcome: '', visitType: '',
      appointmentDate: '', visitTime: '', note: '',
    },
  })

  useEffect(() => {
    if (!open) return
    if (visit) {
      reset({
        subject:         visit.subject,
        partner:         visit.partner ?? '',
        outcome:         visit.outcome ?? '',
        visitType:       visit.visitType ?? '',
        appointmentDate: visit.appointmentDate,
        visitTime:       visit.visitTime ?? '',
        note:            visit.note ?? '',
      })
    } else {
      reset({
        subject:         prefill?.subject ?? '',
        partner:         prefill?.partner ?? '',
        outcome:         '',
        visitType:       '',
        appointmentDate: prefill?.appointmentDate ?? '',
        visitTime:       prefill?.visitTime ?? '',
        note:            '',
      })
    }
  }, [visit, prefill, open, reset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('titleEdit') : t('titleNew')}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) =>
            onSave({ ...values, appointmentId: visit?.appointmentId ?? prefill?.appointmentId })
          )}
          className="space-y-4 py-1"
        >
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-subject">{t('subject')} *</Label>
            <Input id="vf-subject" {...register('subject')} placeholder={t('subjectPlaceholder')} />
            {errors.subject && <p className="text-xs text-destructive">{t('subjectRequired')}</p>}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vf-date">{t('date')} *</Label>
              <Input
                id="vf-date"
                type="date"
                readOnly={hasCalendarPrefill}
                className={hasCalendarPrefill ? 'bg-muted cursor-default' : ''}
                {...register('appointmentDate')}
              />
              {errors.appointmentDate && <p className="text-xs text-destructive">{t('dateRequired')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vf-time">{t('time')}</Label>
              <Input
                id="vf-time"
                type="time"
                readOnly={hasCalendarPrefill}
                className={hasCalendarPrefill ? 'bg-muted cursor-default' : ''}
                {...register('visitTime')}
              />
            </div>
          </div>

          {/* Partner */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-partner">{t('partner')}</Label>
            <Input id="vf-partner" {...register('partner')} placeholder={t('partnerPlaceholder')} />
          </div>

          {/* Visit type + Outcome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('visitType')}</Label>
              <Controller
                control={control}
                name="visitType"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger>
                    <SelectContent>
                      {VISIT_TYPE_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{tv(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('outcome')}</Label>
              <Controller
                control={control}
                name="outcome"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder={t('selectOutcome')} /></SelectTrigger>
                    <SelectContent>
                      {OUTCOME_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>{to(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="vf-note">{t('notes')}</Label>
            <Textarea id="vf-note" {...register('note')} placeholder={t('notesPlaceholder')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />}
              {isEdit ? t('saveChanges') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
