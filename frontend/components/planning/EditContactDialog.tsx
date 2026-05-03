'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
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
}

export function EditContactDialog({ contact, open, onOpenChange, onUpdated }: Props) {
  const t  = useTranslations('editContact')
  const tc = useTranslations('common')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '', jobTitle: '', companyName: '',
      street: '', postalCode: '', city: '', country: '',
      mobilePhone: '', email: '',
    },
  })

  useEffect(() => {
    if (!contact) return
    const addr = contact.businessAddress ?? contact.homeAddress
    reset({
      displayName:  contact.displayName ?? '',
      jobTitle:     contact.jobTitle ?? '',
      companyName:  contact.companyName ?? '',
      street:       addr?.street ?? '',
      postalCode:   addr?.postalCode ?? '',
      city:         addr?.city ?? '',
      country:      addr?.countryOrRegion ?? '',
      mobilePhone:  contact.mobilePhone ?? '',
      email:        contact.emailAddresses?.[0]?.address ?? '',
    })
  }, [contact, reset])

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
      const res = await fetch(`/api/graph/contacts/${contact.id}`, {
        method: 'PUT',
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
      toast.success(t('success'))
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
