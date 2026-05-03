/**
 * seed-calendar.mjs
 *
 * Creates 30 realistic visit appointments in your Outlook calendar via Microsoft Graph.
 *
 * Usage:
 *   ACCESS_TOKEN=<your_token> node scripts/seed-calendar.mjs
 *
 * How to get ACCESS_TOKEN:
 *   1. Open the app in your browser (http://localhost:3000)
 *   2. Open DevTools → Network tab → filter by "api" or "graph"
 *      Look for any request to localhost:8081, copy the "Authorization: Bearer <token>" value
 *      OR: DevTools → Application → Cookies → copy "__Secure-next-auth.session-token",
 *          then go to https://jwt.ms and decode it to find accessToken
 *   3. Run: ACCESS_TOKEN=eyJ0... node scripts/seed-calendar.mjs
 */

const rawToken = process.env.ACCESS_TOKEN

if (!rawToken) {
  console.error('❌  Missing ACCESS_TOKEN env variable.')
  console.error('   Usage: ACCESS_TOKEN=<token> node scripts/seed-calendar.mjs')
  process.exit(1)
}

// Accept token with or without "Bearer " prefix
const TOKEN = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function iso(date, hour, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const TIMEZONE = 'Europe/Berlin'

const APPOINTMENTS = [
  // ── Week 1 (1-5 days ago) ─────────────────────────────────────────────────
  {
    subject: 'Visit — Müller GmbH',
    daysBack: 1,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Hauptstraße 14, 80331 München, Germany',
    notes: 'Annual review + new product presentation Q1',
  },
  {
    subject: 'Follow-up — Schneider & Partner',
    daysBack: 2,
    startH: 11, startM: 0, endH: 12, endM: 0,
    location: 'Karlsplatz 7, 80335 München, Germany',
    notes: 'Follow-up after December quote. Decision expected this week.',
  },
  {
    subject: 'Demo — Fischer Medizintechnik',
    daysBack: 3,
    startH: 14, startM: 0, endH: 15, endM: 30,
    location: 'Rosenheimer Str. 145, 81671 München, Germany',
    notes: 'Product demo: new surgical kit series',
  },
  {
    subject: 'Visit — Weber Dental',
    daysBack: 4,
    startH: 9, startM: 30, endH: 10, endM: 30,
    location: 'Leopoldstraße 22, 80802 München, Germany',
    notes: 'Routine quarterly visit',
  },
  {
    subject: 'Training — Wagner Orthopädie',
    daysBack: 5,
    startH: 13, startM: 0, endH: 15, endM: 0,
    location: 'Nymphenburger Str. 60, 80335 München, Germany',
    notes: 'Staff training: new implant handling procedures',
  },

  // ── Week 2 (6-12 days ago) ────────────────────────────────────────────────
  {
    subject: 'Visit — Bauer Pharma',
    daysBack: 6,
    startH: 10, startM: 0, endH: 11, endM: 0,
    location: 'Sendlinger Str. 45, 80331 München, Germany',
    notes: 'Reorder discussion + complaint follow-up on batch #4421',
  },
  {
    subject: 'Consultation — Richter Medizin AG',
    daysBack: 8,
    startH: 15, startM: 0, endH: 16, endM: 0,
    location: 'Tal 37, 80331 München, Germany',
    notes: 'Consulting on new procurement process',
  },
  {
    subject: 'Visit — Klein & Söhne',
    daysBack: 9,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Maximilianstraße 10, 80539 München, Germany',
    notes: 'Order collection for Q2',
  },
  {
    subject: 'Visit — Wolf Chirurgie GmbH',
    daysBack: 11,
    startH: 11, startM: 0, endH: 12, endM: 0,
    location: 'Elisabethstr. 34, 80796 München, Germany',
    notes: 'New contact: Dr. Berger — acquisition visit',
  },
  {
    subject: 'Demo — Schröder Klinik',
    daysBack: 12,
    startH: 14, startM: 0, endH: 15, endM: 0,
    location: 'Prinzregentenstr. 18, 80538 München, Germany',
    notes: 'Demo: endoscopy equipment. Positive interest.',
  },

  // ── Week 3 (13-20 days ago) ───────────────────────────────────────────────
  {
    subject: 'Visit — Braun Medizin',
    daysBack: 14,
    startH: 10, startM: 0, endH: 11, endM: 0,
    location: 'Theatinerstr. 8, 80333 München, Germany',
    notes: 'Contract renewal discussion',
  },
  {
    subject: 'Follow-up — Hofmann Dental',
    daysBack: 15,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Baaderstr. 54, 80469 München, Germany',
    notes: 'Follow-up on delayed invoice. Payment confirmed.',
  },
  {
    subject: 'Visit — Zimmermann AG',
    daysBack: 17,
    startH: 13, startM: 0, endH: 14, endM: 0,
    location: 'Schwanthalerstr. 70, 80336 München, Germany',
    notes: 'Quarterly review — new CFO present',
  },
  {
    subject: 'Visit — Hartmann & Co.',
    daysBack: 19,
    startH: 15, startM: 0, endH: 16, endM: 0,
    location: 'Landsberger Str. 155, 80687 München, Germany',
    notes: 'Project presentation: logistics upgrade proposal',
  },
  {
    subject: 'Training — Krause Medizintechnik',
    daysBack: 20,
    startH: 10, startM: 0, endH: 12, endM: 0,
    location: 'Tegernseer Landstr. 89, 81539 München, Germany',
    notes: 'Training on sterilization protocol updates',
  },

  // ── Week 4-5 (21-35 days ago) ─────────────────────────────────────────────
  {
    subject: 'Visit — Maier Laborgeräte',
    daysBack: 22,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Goethestraße 31, 80336 München, Germany',
    notes: 'New client — first visit after trade fair contact',
  },
  {
    subject: 'Consultation — Neumann Klinikum',
    daysBack: 24,
    startH: 11, startM: 30, endH: 12, endM: 30,
    location: 'Ismaninger Str. 22, 81675 München, Germany',
    notes: 'Budget review and equipment planning for H2',
  },
  {
    subject: 'Visit — Schulz Orthopädie',
    daysBack: 26,
    startH: 14, startM: 0, endH: 15, endM: 0,
    location: 'Sonnenstraße 19, 80331 München, Germany',
    notes: 'Order for knee brace series — confirmed',
  },
  {
    subject: 'Demo — Herrmann Pharma',
    daysBack: 28,
    startH: 10, startM: 0, endH: 11, endM: 30,
    location: 'Frauenlobstr. 22, 80337 München, Germany',
    notes: 'New cold-chain product demo — decision expected next month',
  },
  {
    subject: 'Visit — König GmbH',
    daysBack: 30,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Dachauerstr. 37, 80335 München, Germany',
    notes: 'Routine visit. Satisfaction survey completed.',
  },

  // ── Month 2 (35-60 days ago) ──────────────────────────────────────────────
  {
    subject: 'Follow-up — Lange & Partner',
    daysBack: 35,
    startH: 13, startM: 0, endH: 14, endM: 0,
    location: 'Arnulfstraße 60, 80335 München, Germany',
    notes: 'Follow-up on project proposal from last month',
  },
  {
    subject: 'Visit — Lehmann Dental',
    daysBack: 40,
    startH: 9, startM: 30, endH: 10, endM: 30,
    location: 'Paul-Heyse-Str. 28, 80336 München, Germany',
    notes: 'Annual contract review. 8% price increase accepted.',
  },
  {
    subject: 'Visit — Schmitt Rehatechnik',
    daysBack: 44,
    startH: 14, startM: 0, endH: 15, endM: 0,
    location: 'Ganghoferstr. 66, 80339 München, Germany',
    notes: 'Presentation of new mobility aids range',
  },
  {
    subject: 'Acquisition — Böhm Kliniken',
    daysBack: 48,
    startH: 10, startM: 0, endH: 11, endM: 0,
    location: 'Lindwurmstr. 10, 80337 München, Germany',
    notes: 'Cold call turned warm — presented full catalogue',
  },
  {
    subject: 'Visit — Werner Chirurgie',
    daysBack: 52,
    startH: 15, startM: 0, endH: 16, endM: 0,
    location: 'Zugspitzstraße 40, 82049 Pullach, Germany',
    notes: 'Complaint handling: wrong delivery in November, resolved',
  },

  // ── Month 3 (60-100 days ago) ─────────────────────────────────────────────
  {
    subject: 'Visit — Aigner Medizin',
    daysBack: 62,
    startH: 9, startM: 0, endH: 10, endM: 0,
    location: 'Bavariastraße 5, 80336 München, Germany',
    notes: 'Q4 order finalised — EUR 12,400',
  },
  {
    subject: 'Training — Huber Klinik',
    daysBack: 70,
    startH: 13, startM: 0, endH: 16, endM: 0,
    location: 'Grünwalder Str. 100, 81547 München, Germany',
    notes: 'Half-day training on new ventilator interface',
  },
  {
    subject: 'Demo — Pfeiffer Pharma',
    daysBack: 80,
    startH: 10, startM: 0, endH: 11, endM: 0,
    location: 'Klenzestraße 49, 80469 München, Germany',
    notes: 'Demo of upgraded packaging line. No order yet.',
  },
  {
    subject: 'Visit — Bergmann Sanitätshaus',
    daysBack: 90,
    startH: 9, startM: 0, endH: 10, endM: 30,
    location: 'Wörthstraße 15, 81667 München, Germany',
    notes: 'Start of new partnership — first order placed',
  },
  {
    subject: 'Follow-up — Gruber & Söhne',
    daysBack: 100,
    startH: 14, startM: 0, endH: 15, endM: 0,
    location: 'Rosenheimer Platz 4, 81669 München, Germany',
    notes: 'Follow-up on Q3 trade fair contact. Budget approved for Q1.',
  },
]

// ─── Build Graph $batch requests ──────────────────────────────────────────────

function buildRequests(appointments) {
  return appointments.map((apt, idx) => {
    const date = daysAgo(apt.daysBack)
    const body = {
      subject: apt.subject,
      start: { dateTime: iso(date, apt.startH, apt.startM ?? 0), timeZone: TIMEZONE },
      end:   { dateTime: iso(date, apt.endH,   apt.endM   ?? 0), timeZone: TIMEZONE },
      location: { displayName: apt.location },
      body: { contentType: 'text', content: apt.notes ?? 'Created by VisitFlow seed script.' },
    }
    return {
      id: String(idx + 1),
      method: 'POST',
      url: '/me/events',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🗓  Seeding ${APPOINTMENTS.length} calendar events…\n`)

  const requests = buildRequests(APPOINTMENTS)

  let created = 0
  let failed  = 0

  // Graph $batch supports max 20 requests per call
  for (let i = 0; i < requests.length; i += 20) {
    const chunk = requests.slice(i, i + 20)

    const res = await fetch('https://graph.microsoft.com/v1.0/$batch', {
      method: 'POST',
      headers: {
        Authorization: TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: chunk }),
    })

    if (!res.ok) {
      console.error(`❌  Batch request failed: ${res.status} ${res.statusText}`)
      const text = await res.text().catch(() => '')
      console.error(text)
      process.exit(1)
    }

    const data = await res.json()

    for (const r of data.responses) {
      const apt = chunk.find((c) => c.id === r.id)
      const subj = apt?.body?.subject ?? `req#${r.id}`
      if (r.status === 201) {
        console.log(`  ✅  ${subj}`)
        created++
      } else {
        console.log(`  ❌  ${subj} — HTTP ${r.status}: ${r.body?.error?.message ?? 'unknown'}`)
        failed++
      }
    }
  }

  console.log(`\n📊  Done — ${created} created, ${failed} failed`)

  if (failed > 0) {
    console.log('\n💡  Common causes of failure:')
    console.log('   • Token expired — grab a fresh one from the browser')
    console.log('   • Calendars.ReadWrite permission not granted in Azure AD')
  } else {
    console.log('\n✨  Open http://localhost:3000/visits and click "Load" to see the events.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
