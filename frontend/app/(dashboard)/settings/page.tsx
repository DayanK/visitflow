import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserSettingsForm } from '@/components/settings/UserSettingsForm'
import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const user = session!.user
  const userId = user.id ?? user.email!
  const username = user.email!
  const t = await getTranslations('settings')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{t('subtitle')}</p>
      </div>
      <UserSettingsForm userId={userId} username={username} />
    </div>
  )
}
