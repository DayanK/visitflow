import type { NextAuthOptions, User } from 'next-auth'
import AzureAD from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'

const GRAPH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Contacts.ReadWrite',
  'Calendars.ReadWrite',
  'MailboxSettings.ReadWrite',
].join(' ')

interface TeamsUser extends User {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

const isProd = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  // Teams runs our app in an iframe — cookies must be SameSite=None so they
  // are sent/received in the cross-site iframe context.
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none' as const,
        path: '/',
        secure: true,
      },
    },
  },
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
      authorization: {
        params: { scope: GRAPH_SCOPES },
      },
    }),

    // Teams SSO: exchange the silent SSO token via On-Behalf-Of flow
    CredentialsProvider({
      id: 'teams-sso',
      name: 'Teams SSO',
      credentials: { teamsToken: { type: 'text' } },
      async authorize(credentials): Promise<TeamsUser | null> {
        if (!credentials?.teamsToken) return null
        try {
          const res = await fetch(
            `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                client_id: process.env.AZURE_AD_CLIENT_ID!,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
                assertion: credentials.teamsToken,
                requested_token_use: 'on_behalf_of',
                scope: GRAPH_SCOPES,
              }),
            }
          )
          if (!res.ok) return null
          const tokens = await res.json()
          const payload = JSON.parse(
            Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
          )
          return {
            id: payload.oid ?? payload.sub,
            name: payload.name,
            email: payload.preferred_username ?? payload.upn ?? payload.email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
          }
        } catch {
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // Initial Azure AD OAuth sign-in
      if (account) {
        return {
          ...token,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }

      // Initial Teams SSO credentials sign-in
      if (user && (user as TeamsUser).accessToken) {
        const u = user as TeamsUser
        return {
          ...token,
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          expiresAt: u.expiresAt,
        }
      }

      // Token still valid
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) {
        return token
      }

      // Token expired — try refresh
      if (!token.refreshToken) {
        return { ...token, error: 'RefreshAccessTokenError' as const }
      }

      try {
        const response = await fetch(
          `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: process.env.AZURE_AD_CLIENT_ID!,
              client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
              refresh_token: token.refreshToken,
              scope: GRAPH_SCOPES,
            }),
          }
        )

        const refreshed = await response.json()
        if (!response.ok) throw refreshed

        return {
          ...token,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000 + refreshed.expires_in),
          error: undefined,
        }
      } catch {
        return { ...token, error: 'RefreshAccessTokenError' as const }
      }
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.error = token.error
      if (token.sub) session.user.id = token.sub
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: { strategy: 'jwt' },
}
