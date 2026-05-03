import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'graph.microsoft.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Teams to embed the app in its iframe
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors 'self'",
              'https://teams.microsoft.com',
              'https://*.teams.microsoft.com',
              'https://*.skype.com',
              'https://teams.cloud.microsoft',
              'https://*.teams.cloud.microsoft',
              'https://*.office.com',
              'https://*.microsoft365.com',
            ].join(' '),
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
