import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Zap, Building2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export async function generateMetadata() {
  const t = await getTranslations('subscription')
  return { title: `${t('title')} — VisitFlow` }
}

export default async function SubscriptionPage() {
  const t = await getTranslations('subscription')
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '#'

  const freeTier = [
    t('free.f1'), t('free.f2'), t('free.f3'), t('free.f4'),
  ]
  const proTier = [
    t('pro.f1'), t('pro.f2'), t('pro.f3'), t('pro.f4'), t('pro.f5'),
  ]
  const enterpriseTier = [
    t('enterprise.f1'), t('enterprise.f2'), t('enterprise.f3'), t('enterprise.f4'),
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Free */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary">{t('free.badge')}</Badge>
            </div>
            <CardTitle className="text-xl mt-3">{t('free.name')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('free.price')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4">
            <ul className="space-y-2 flex-1">
              {freeTier.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" disabled>
              {t('free.cta')}
            </Button>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="flex flex-col border-primary/50 bg-primary/5 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-3">{t('pro.badge')}</Badge>
          </div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-xl mt-3">{t('pro.name')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('pro.price')}</span>
              <span className="text-sm text-muted-foreground ml-1">{t('pro.period')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4">
            <ul className="space-y-2 flex-1">
              {proTier.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full">
              <Link href={stripeLink} target="_blank" rel="noopener noreferrer">
                {t('pro.cta')}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl mt-3">{t('enterprise.name')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('enterprise.price')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 gap-4">
            <ul className="space-y-2 flex-1">
              {enterpriseTier.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild className="w-full">
              <Link href="mailto:contact@visitflow.app">{t('enterprise.cta')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
