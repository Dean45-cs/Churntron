/**
 * Sichtpruefung: meldet sich an und legt Screenshots aller Seiten in hell und
 * dunkel ab – jeweils im Skeleton-Zustand und fertig geladen.
 *
 *   npm run dev:skeletons          # in einem zweiten Terminal
 *   SHOT_DIR=./screenshots node scripts/screenshots.mjs
 *
 * Ohne SKELETON_DEMO=1 antwortet die lokale Datenbank zu schnell, um die
 * Ladezustaende zu erwischen.
 */
import { chromium } from 'playwright'

const OUT = process.env.SHOT_DIR ?? './screenshots'
const BASE = 'http://localhost:3000'
const PAGES = [
  ['dashboard', '/dashboard'],
  ['churn', '/dashboard/churn'],
  ['commissions', '/dashboard/commissions'],
  ['commissions-verdienst', '/dashboard/commissions/verdienst'],
  ['commissions-rechner', '/dashboard/commissions/rechner'],
  ['commissions-abgleich', '/dashboard/commissions/abgleich'],
  ['commissions-katalog', '/dashboard/commissions/katalog'],
  ['challenges', '/dashboard/challenges'],
]

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  })
  const page = await ctx.newPage()

  // Theme festnageln, bevor die App laedt
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('churntron-theme', t)
    } catch {}
  }, theme)

  // Anmelden (admin, damit auch die Admin-Bereiche zu sehen sind)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  if (theme === 'light') await page.screenshot({ path: `${OUT}/00-login.png` })
  await page.fill('input[name=email]', 'admin@tng.de')
  await page.fill('input[name=password]', process.env.DEMO_PASSWORD ?? 'churntron')
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 30000 }),
    page.click('button[type=submit]'),
  ])
  await page.waitForLoadState('networkidle')

  for (const [name, path] of PAGES) {
    // 1) Skeleton-Zustand: sofort nach dem Navigieren, bevor die Daten da sind
    await page.goto(`${BASE}${path}`, { waitUntil: 'commit' })
    await page.waitForTimeout(450)
    const skeletons = await page.locator('.skeleton').count()
    await page.screenshot({ path: `${OUT}/${name}-${theme}-skeleton.png` })

    // 2) Fertiger Zustand
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    const restSkeletons = await page.locator('.skeleton').count()
    await page.screenshot({ path: `${OUT}/${name}-${theme}.png` })

    console.log(`${theme}/${name}: ${skeletons} Skeletons beim Laden, ${restSkeletons} danach`)
  }
  await ctx.close()
}

await browser.close()
console.log('fertig')
