import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LoginButton } from './login-button'
import { Route } from 'lucide-react'

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/planning')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="w-full max-w-md px-8 py-10 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg">
            <Route className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">VisitFlow</h1>
            <p className="text-slate-400 text-sm mt-1">Intelligent route planning</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-sm text-slate-400">Sign in with your Microsoft account to continue</p>
          </div>

          <LoginButton />

          <p className="text-xs text-slate-500 text-center">
            By signing in, you agree to use this app within your organization&apos;s policies.
          </p>
        </div>
      </div>
    </main>
  )
}
