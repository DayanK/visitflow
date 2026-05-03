import { Route } from 'lucide-react'

export const metadata = { title: 'Terms of Use — VisitFlow' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <Route className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">VisitFlow</span>
        </div>

        <h1 className="text-3xl font-bold text-white">Terms of Use</h1>
        <p className="text-sm text-slate-400">Last updated: April 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Acceptance of terms</h2>
          <p className="text-slate-300 leading-relaxed">
            By accessing or using VisitFlow, you agree to be bound by these Terms of Use.
            If you do not agree to these terms, you may not use the application. VisitFlow
            is intended for use by authorised employees of organisations that have provisioned
            the application through Microsoft Teams or as a standalone web application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. Use of the application</h2>
          <p className="text-slate-300 leading-relaxed">
            VisitFlow is provided as a business productivity tool for planning field visits
            and managing customer interactions. You agree to use the application only for
            lawful business purposes and in accordance with your organisation's policies.
            You must not attempt to access data belonging to other users or misuse the
            Microsoft Graph API integration.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Microsoft 365 integration</h2>
          <p className="text-slate-300 leading-relaxed">
            VisitFlow accesses your Microsoft 365 account (contacts, calendar, and profile)
            with your explicit consent via OAuth 2.0. You are responsible for maintaining
            the security of your Microsoft account credentials. You may revoke VisitFlow's
            access at any time from your Microsoft account's App Permissions settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Data responsibility</h2>
          <p className="text-slate-300 leading-relaxed">
            You are responsible for the accuracy and appropriateness of the data you enter
            into VisitFlow, including visit reports and contact information. Do not store
            sensitive personal data beyond what is necessary for legitimate business purposes.
            The application administrator of your organisation is responsible for managing
            user access and data governance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Availability and changes</h2>
          <p className="text-slate-300 leading-relaxed">
            VisitFlow is provided "as is" without warranties of any kind. We do not guarantee
            uninterrupted availability of the service. We reserve the right to modify,
            suspend, or discontinue any aspect of the application at any time. We may update
            these Terms of Use; continued use of the application constitutes acceptance of
            the updated terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6. Limitation of liability</h2>
          <p className="text-slate-300 leading-relaxed">
            To the fullest extent permitted by law, VisitFlow and its operators shall not
            be liable for any indirect, incidental, or consequential damages arising from
            your use of the application, including any loss of data or business interruption.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">7. Contact</h2>
          <p className="text-slate-300 leading-relaxed">
            For questions about these Terms of Use, please contact the application
            administrator of your organisation.
          </p>
        </section>
      </div>
    </main>
  )
}
