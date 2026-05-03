'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { notesApi } from '@/lib/api'
import type { GraphContact } from '@/types'

const schema = z.object({
  displayName:  z.string().min(1),
  jobTitle:     z.string().optional(),
  companyName:  z.string().optional(),
  street:       z.string().min(1),
  postalCode:   z.string().optional(),
  city:         z.string().min(1),
  country:      z.string().min(1),
  mobilePhone:  z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

interface Props {
  contact: GraphContact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
  onNoteSaved?: (contactId: string, hasNote: boolean) => void
}

function getDefaultValues(contact: GraphContact | null): FormValues {
  if (!contact) return { displayName: '', jobTitle: '', companyName: '', street: '', postalCode: '', city: '', country: '', mobilePhone: '', email: '' }
  const addr = contact.businessAddress ?? contact.homeAddress
  return {
    displayName:  contact.displayName ?? '',
    jobTitle:     contact.jobTitle ?? '',
    companyName:  contact.companyName ?? '',
    street:       addr?.street ?? '',
    postalCode:   addr?.postalCode ?? '',
    city:         addr?.city ?? '',
    country:      addr?.countryOrRegion ?? '',
    mobilePhone:  contact.mobilePhone ?? '',
    email:        contact.emailAddresses?.[0]?.address ?? '',
  }
}

export function EditContactDialog({ contact, open, onOpenChange, onUpdated, onNoteSaved }: Props) {
  const t  = useTranslations('editContact')
  const tc = useTranslations('common')
  const { data: session } = useSession()
  const userId = session?.user?.email ?? ''

  const [noteContent, setNoteContent] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // Load note when dialog opens
  useEffect(() => {
    if (!open || !contact || !userId) return
    setNoteLoading(true)
    notesApi.get(userId, contact.id)
      .then((n) => setNoteContent(n?.content ?? ''))
      .catch(() => setNoteContent(''))
      .finally(() => setNoteLoading(false))
  }, [open, contact?.id, userId])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(contact),
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!contact) return
      const body: Record<string, unknown> = {
        displayName: values.displayName,
        jobTitle:    values.jobTitle    ?? '',
        companyName: values.companyName ?? '',
        mobilePhone: values.mobilePhone ?? '',
        emailAddresses: values.email
          ? [{ address: values.email, name: values.displayName }]
          : [],
        businessAddress: {
          street:          values.street       ?? '',
          city:            values.city         ?? '',
          postalCode:      values.postalCode   ?? '',
          countryOrRegion: values.country      ?? '',
        },
      }
      const [contactRes] = await Promise.all([
        fetch(`/api/graph/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        userId ? notesApi.save(userId, contact.id, noteContent) : Promise.resolve(),
      ])
      if (!contactRes.ok) {
        const err = await contactRes.json().catch(() => ({}))
        throw new Error(err?.error ?? contactRes.statusText)
      }
      return contactRes.json()
    },
    onSuccess: () => {
      toast.success(t('success'))
      onNoteSaved?.(contact!.id, noteContent.trim().length > 0)
      onOpenChange(false)
      onUpdated()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" suppressHydrationWarning />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('title')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">{t('displayName')} *</Label>
            <Input id="ec-name" {...register('displayName')} placeholder={t('displayNamePlaceholder')} />
            {errors.displayName && <p className="text-xs text-destructive">{t('displayNameRequired')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-title">{t('jobTitle')}</Label>
              <Input id="ec-title" {...register('jobTitle')} placeholder={t('jobTitlePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-company">{t('company')}</Label>
              <Input id="ec-company" {...register('companyName')} placeholder={t('companyPlaceholder')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="ec-street">{t('street')} *</Label>
              <Input id="ec-street" {...register('street')} className={errors.street ? 'border-destructive' : ''} />
              {errors.street && <p className="text-xs text-destructive">{t('streetRequired')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-zip">{t('postalCode')}</Label>
              <Input id="ec-zip" {...register('postalCode')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-city">{t('city')} *</Label>
              <Input id="ec-city" {...register('city')} className={errors.city ? 'border-destructive' : ''} />
              {errors.city && <p className="text-xs text-destructive">{t('cityRequired')}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="ec-country">{t('country')} *</Label>
              <Input id="ec-country" {...register('country')} className={errors.country ? 'border-destructive' : ''} />
              {errors.country && <p className="text-xs text-destructive">{t('countryRequired')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">{t('phone')}</Label>
              <Input id="ec-phone" type="tel" {...register('mobilePhone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-email">{t('email')}</Label>
              <Input id="ec-email" type="email" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-xs text-destructive">{t('emailInvalid')}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-note">{t('notes')}</Label>
            {noteLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-20 px-3 border rounded-md">
                <Loader2 className="h-3 w-3 animate-spin" suppressHydrationWarning />
                {tc('loading')}
              </div>
            ) : (
              <Textarea
                id="ec-note"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="resize-none h-20 text-sm"
              />
            )}
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
                : <><Pencil className="mr-2 h-4 w-4" suppressHydrationWarning />{t('saveButton')}</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
