/**
 * save-teams-icons.mjs
 * Fetches the generated icons from the local dev server and saves them as PNG files.
 *
 * Usage (while `npm run dev` is running):
 *   node scripts/save-teams-icons.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  console.log(`  ✅  Saved ${dest}`)
}

async function main() {
  console.log(`\n🎨  Generating Teams icons from ${BASE_URL}…\n`)

  const teamsDir = join(__dirname, '..', 'teams')

  await download(
    `${BASE_URL}/api/teams/icons/color`,
    join(teamsDir, 'color.png')
  )

  await download(
    `${BASE_URL}/api/teams/icons/outline`,
    join(teamsDir, 'outline.png')
  )

  console.log('\n✨  Icons saved to visitflow/teams/')
  console.log('   Next step: package the app with:')
  console.log('   cd visitflow/teams && zip visitflow-teams.zip manifest.json color.png outline.png\n')
}

main().catch((err) => {
  console.error('❌', err.message)
  console.error('   Make sure the dev server is running: npm run dev')
  process.exit(1)
})
