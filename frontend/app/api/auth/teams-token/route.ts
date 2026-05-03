import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'

const GRAPH_SCOPES =
  'openid profile email offline_access User.Read Contacts.ReadWrite Calendars.ReadWrite MailboxSettings.ReadWrite'

export async function POST(req: NextRequest) {
  try {
    const { token: ssoToken } = await req.json()
    if (!ssoToken) return NextResponse.json({ error: 'missing token' }, { status: 400 })

    // Exchange Teams SSO token for Graph tokens via OBO
    const oboRes = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          assertion: ssoToken,
          requested_token_use: 'on_behalf_of',
          scope: GRAPH_SCOPES,
        }),
      }
    )

    const oboData = await oboRes.json()
    if (!oboRes.ok) {
      // Return the exact Microsoft error so the client debug can show it
      return NextResponse.json(
        { error: oboData.error, description: oboData.error_description?.slice(0, 200) },
        { status: 401 }
      )
    }

    // Decode access token to get user info
    const payload = JSON.parse(
      Buffer.from(oboData.access_token.split('.')[1], 'base64url').toString()
    )

    // Build a NextAuth-compatible JWT and set it as a session cookie
    const secret = process.env.NEXTAUTH_SECRET!
    const sessionJwt = await encode({
      secret,
      token: {
        sub: payload.oid ?? payload.sub,
        name: payload.name,
        email: payload.preferred_username ?? payload.upn ?? payload.email,
        picture: undefined,
        accessToken: oboData.access_token,
        refreshToken: oboData.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + (oboData.expires_in ?? 3600),
      },
    })

    const prod = process.env.NODE_ENV === 'production'
    const cookieName = prod ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    const response = NextResponse.json({ ok: true })
    response.cookies.set(cookieName, sessionJwt, {
      httpOnly: true,
      secure: true,       // always true — required for SameSite=None
      sameSite: 'none',   // required for Teams cross-site iframe
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
