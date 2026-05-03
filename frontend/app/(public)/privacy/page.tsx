import { Route } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — VisitFlow' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <Route className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">VisitFlow</span>
        </div>

        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-sm text-slate-400">Last updated: April 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Data we access</h2>
          <p className="text-slate-300 leading-relaxed">
            VisitFlow accesses your Microsoft 365 account data through the Microsoft Graph API
            with your explicit consent. This includes your Outlook contacts, calendar events,
            and basic profile information (name, email address). This data is used solely to
            provide the route planning and visit management features of the application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. Data storage</h2>
          <p className="text-slate-300 leading-relaxed">
            Visit reports and user settings are stored in Azure Table Storage associated with
            your user account. No contact or calendar data is permanently stored — it is
            fetched live from Microsoft Graph on each request. Authentication tokens are stored
            only in encrypted session cookies in your browser and are never persisted on our
            servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Data sharing</h2>
          <p className="text-slate-300 leading-relaxed">
            We do not sell, share, or transfer your personal data to any third parties.
            Your data is used exclusively to operate the VisitFlow application on your behalf.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Data retention</h2>
          <p className="text-slate-300 leading-relaxed">
            Visit reports and settings are retained as long as your account is active. You may
            delete individual visit reports at any time within the application. To request full
            data deletion, contact us at the address below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Security</h2>
          <p className="text-slate-300 leading-relaxed">
            All communication between the application and Microsoft Graph is secured via HTTPS
            and OAuth 2.0 with the principle of least privilege. We request only the permissions
            necessary for the features you use.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6. Contact</h2>
          <p className="text-slate-300 leading-relaxed">
            For any privacy-related questions or data deletion requests, please contact the
            application administrator of your organisation.
          </p>
        </section>
      </div>
    </main>
  )
}
