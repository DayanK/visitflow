'use client'

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
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

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
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateContactDialog({ open, onOpenChange, onCreated }: Props) {
  const t  = useTranslations('createContact')
  const tc = useTranslations('common')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '', jobTitle: '', companyName: '',
      street: '', postalCode: '', city: '', country: '',
      mobilePhone: '', email: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: Record<string, unknown> = {
        displayName: values.displayName,
      }
      if (values.jobTitle)    body.jobTitle    = values.jobTitle
      if (values.companyName) body.companyName = values.companyName
      if (values.mobilePhone) body.mobilePhone = values.mobilePhone
      if (values.email) {
        body.emailAddresses = [{ address: values.email, name: values.displayName }]
      }
      const hasAddr = values.street || values.city || values.postalCode || values.country
      if (hasAddr) {
        body.businessAddress = {
          street:          values.street       ?? '',
          city:            values.city         ?? '',
          postalCode:      values.postalCode   ?? '',
          countryOrRegion: values.country      ?? '',
        }
      }
      const res = await fetch('/api/graph/contacts', {
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
      toast.success(t('success'))
      reset()
      onOpenChange(false)
      onCreated()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) { onOpenChange(v); if (!v) reset() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" suppressHydrationWarning />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('title')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cc-name">{t('displayName')} *</Label>
            <Input id="cc-name" {...register('displayName')} placeholder={t('displayNamePlaceholder')} />
            {errors.displayName && <p className="text-xs text-destructive">{t('displayNameRequired')}</p>}
          </div>

          {/* Job title + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-title">{t('jobTitle')}</Label>
              <Input id="cc-title" {...register('jobTitle')} placeholder={t('jobTitlePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-company">{t('company')}</Label>
              <Input id="cc-company" {...register('companyName')} placeholder={t('companyPlaceholder')} />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cc-street">{t('street')} *</Label>
              <Input id="cc-street" {...register('street')} className={errors.street ? 'border-destructive' : ''} />
              {errors.street && <p className="text-xs text-destructive">{t('streetRequired')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-zip">{t('postalCode')}</Label>
              <Input id="cc-zip" {...register('postalCode')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-city">{t('city')} *</Label>
              <Input id="cc-city" {...register('city')} className={errors.city ? 'border-destructive' : ''} />
              {errors.city && <p className="text-xs text-destructive">{t('cityRequired')}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cc-country">{t('country')} *</Label>
              <Input id="cc-country" {...register('country')} className={errors.country ? 'border-destructive' : ''} />
              {errors.country && <p className="text-xs text-destructive">{t('countryRequired')}</p>}
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-phone">{t('phone')}</Label>
              <Input id="cc-phone" type="tel" {...register('mobilePhone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-email">{t('email')}</Label>
              <Input id="cc-email" type="email" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-xs text-destructive">{t('emailInvalid')}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); reset() }}
              disabled={mutation.isPending}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" suppressHydrationWarning />{tc('saving')}</>
                : <><UserPlus className="mr-2 h-4 w-4" suppressHydrationWarning />{t('createButton')}</>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
