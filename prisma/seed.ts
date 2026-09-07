import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  Role,
  ContractStatus,
  CancelReason,
  ActivityType,
  ActivityOutcome,
  CommissionStatus,
  ChallengeMetric,
  SourceKind,
} from '@prisma/client'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// ---------------------------------------------------------------------------
// WICHTIG: Alle Daten hier sind frei erfunden. Es gibt bewusst keine Namen,
// Adressen oder Rufnummern von echten Kundinnen und Kunden – auch nicht als
// Testdaten. Die Vertragsnummern sind Fantasienummern.
// ---------------------------------------------------------------------------

/** Deterministischer Zufall, damit der Seed reproduzierbar ist. */
let seedState = 42
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]!
const intBetween = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000)
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000)

const PRODUCTS = [
  { name: 'Glasfaser 300', cents: 3990 },
  { name: 'Glasfaser 600', cents: 4990 },
  { name: 'Glasfaser 1000', cents: 6990 },
  { name: 'Glasfaser 300 + TV', cents: 4790 },
  { name: 'Telefon Flat', cents: 1990 },
] as const

/** Freitexte, wie sie so in den PP-Listen stehen – Basis fuer reasonRaw. */
const REASON_TEXTS: Record<CancelReason, string[]> = {
  PRICE: ['zu teuer', 'Preiserhöhung', 'Wettbewerber günstiger'],
  SERVICE: ['unzufrieden Hotline', 'Störung nicht behoben', 'Terminausfall Technik'],
  MOVE: ['Umzug', 'Umzug ins Ausland', 'Wohnungsauflösung'],
  COMPETITOR: ['Wechsel zu Mitbewerber', 'Abwerbung Haustür'],
  TECHNICAL: ['Leitung instabil', 'Bandbreite nicht erreicht'],
  TERM: ['Sonderkündigungsrecht', 'reguläres Vertragsende'],
  OTHER: ['Sterbefall', 'Doppelvertrag'],
  UNKNOWN: [''],
}

async function main() {
  // Beim Deployen laeuft der Seed bei JEDEM Build mit. Ohne diese Bremse wuerde
  // jeder Redeploy die Datenbank leerraeumen. Mit SEED_ONLY_IF_EMPTY=1 fuellt er
  // nur eine noch leere Datenbank – ein zweiter Aufruf tut dann nichts mehr.
  // Von Hand aufgerufen (npm run db:seed) setzt er weiterhin alles zurueck.
  //
  // FORCE_SEED=1 uebergeht die Bremse. Gebraucht wird das, wenn DEMO_PASSWORD
  // nachtraeglich geaendert wurde: die Passwoerter liegen gehasht in der
  // Datenbank, ein neuer Wert passt sonst nicht mehr dazu.
  const forceSeed = process.env.FORCE_SEED === '1'
  if (!forceSeed && process.env.SEED_ONLY_IF_EMPTY === '1' && (await db.user.count()) > 0) {
    console.log('Datenbank ist bereits befuellt – Seed uebersprungen.')
    return
  }

  console.log('Raeume alte Seed-Daten weg ...')
  await db.pointsEvent.deleteMany()
  await db.commission.deleteMany()
  await db.churnActivity.deleteMany()
  await db.contract.deleteMany()
  await db.importBatch.deleteMany()
  await db.commissionRule.deleteMany()
  await db.challenge.deleteMany()
  await db.user.deleteMany()
  await db.team.deleteMany()

  // --- Teams -------------------------------------------------------------
  const teamNord = await db.team.create({ data: { name: 'Team Nord' } })
  const teamSued = await db.team.create({ data: { name: 'Team Süd' } })

  // --- Nutzer ------------------------------------------------------------
  const password = await bcrypt.hash(process.env.DEMO_PASSWORD ?? 'churntron', 10)
  const people: {
    email: string
    displayName: string
    role: Role
    teamId: string
  }[] = [
    { email: 'admin@tng.de', displayName: 'Sam Ausbilder', role: Role.ADMIN, teamId: teamNord.id },
    { email: 'rep@tng.de', displayName: 'Kevin (Azubi)', role: Role.REP, teamId: teamNord.id },
    { email: 'jo@tng.de', displayName: 'Jo Berger', role: Role.REP, teamId: teamNord.id },
    { email: 'mika@tng.de', displayName: 'Mika Falk', role: Role.REP, teamId: teamSued.id },
    { email: 'toni@tng.de', displayName: 'Toni Kraus', role: Role.REP, teamId: teamSued.id },
    { email: 'ren@tng.de', displayName: 'Ren Ahrens', role: Role.REP, teamId: teamSued.id },
  ]
  const users = []
  for (const p of people) {
    users.push(await db.user.create({ data: { ...p, passwordHash: password } }))
  }
  const reps = users.filter((u) => u.role === Role.REP)
  const admin = users[0]!

  // --- Provisionsregeln (Platzhalter – echtes Modell folgt in Termin 2) ---
  const ruleNeu = await db.commissionRule.create({
    data: {
      name: 'Neuvertrag Glasfaser (Platzhalter)',
      amountCents: 7500,
      clawbackDays: 180,
      validFrom: daysAgo(365),
    },
  })
  const ruleSave = await db.commissionRule.create({
    data: {
      name: 'Rückgewinnung nach Kündigung (Platzhalter)',
      amountCents: 12000,
      clawbackDays: 90,
      validFrom: daysAgo(365),
    },
  })

  // --- Import-Charge, wie sie spaeter aus dem Lookup-Tool kaeme -----------
  const batch = await db.importBatch.create({
    data: {
      filename: 'Welcome_Call_Reporting_20260901.csv',
      rowCount: 60,
      mapping: {
        Vertrag: 'externalRef',
        Kundennummer: 'customerRef',
        Produkt: 'product',
        Ursache: 'reasonRaw',
        Name: '(verworfen – Klardatum)',
        Telefon: '(verworfen – Klardatum)',
      },
      importedById: admin.id,
    },
  })

  // --- Vertraege ---------------------------------------------------------
  const statusPlan: ContractStatus[] = [
    ...Array<ContractStatus>(22).fill(ContractStatus.CANCELLED),
    ...Array<ContractStatus>(8).fill(ContractStatus.REVOKED),
    ...Array<ContractStatus>(9).fill(ContractStatus.WON_BACK),
    ...Array<ContractStatus>(5).fill(ContractStatus.LOST),
    ...Array<ContractStatus>(16).fill(ContractStatus.ACTIVE),
  ]
  // Ohne Mischen entstuenden die Vertraege nach Status gruppiert – dann zeigt
  // jede "neueste zuerst"-Liste nur eine Sorte.
  for (let i = statusPlan.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[statusPlan[i], statusPlan[j]] = [statusPlan[j]!, statusPlan[i]!]
  }

  const contracts = []
  for (let i = 0; i < statusPlan.length; i++) {
    const status = statusPlan[i]!
    const product = pick(PRODUCTS)
    const owner = pick(reps)
    const isChurn =
      status === ContractStatus.CANCELLED ||
      status === ContractStatus.REVOKED ||
      status === ContractStatus.WON_BACK ||
      status === ContractStatus.LOST

    const reason = isChurn
      ? pick([
          CancelReason.PRICE,
          CancelReason.PRICE,
          CancelReason.SERVICE,
          CancelReason.SERVICE,
          CancelReason.MOVE,
          CancelReason.COMPETITOR,
          CancelReason.COMPETITOR,
          CancelReason.TECHNICAL,
          CancelReason.TERM,
          CancelReason.OTHER,
        ])
      : null

    const cancelledDaysAgo = intBetween(3, 120)
    const cancelledAt = isChurn ? daysAgo(cancelledDaysAgo) : null

    contracts.push(
      await db.contract.create({
        data: {
          externalRef: `V-2026-${String(10_000 + i * 7).padStart(5, '0')}`,
          customerRef: `K-${String(400_000 + i * 13)}`,
          product: product.name,
          monthlyCents: product.cents,
          status,
          cancelReason: reason,
          reasonRaw: reason ? pick(REASON_TEXTS[reason]) : null,
          cancelledAt,
          revokedAt: status === ContractStatus.REVOKED ? daysAgo(cancelledDaysAgo) : null,
          // Empfehlung aus dem Leitfaden: 60–90 Tage nach Kuendigung wieder angehen
          reactivateAt: cancelledAt ? new Date(cancelledAt.getTime() + 75 * 86_400_000) : null,
          ownerId: owner.id,
          source: SourceKind.SEED,
          importBatchId: batch.id,
        },
      }),
    )
  }

  // --- Aktivitaeten ------------------------------------------------------
  for (const c of contracts) {
    if (c.status === ContractStatus.ACTIVE) continue
    const calls = intBetween(0, 3)
    for (let k = 0; k < calls; k++) {
      await db.churnActivity.create({
        data: {
          contractId: c.id,
          userId: c.ownerId!,
          type: pick([
            ActivityType.CALL,
            ActivityType.CALL,
            ActivityType.EMAIL,
            ActivityType.OFFER,
          ]),
          outcome:
            c.status === ContractStatus.WON_BACK && k === calls - 1
              ? ActivityOutcome.WON
              : c.status === ContractStatus.LOST && k === calls - 1
                ? ActivityOutcome.LOST
                : pick([
                    ActivityOutcome.REACHED,
                    ActivityOutcome.NOT_REACHED,
                    ActivityOutcome.CALLBACK,
                  ]),
          createdAt: daysAgo(intBetween(1, 60)),
        },
      })
    }
  }

  // --- Provisionen -------------------------------------------------------
  const thisMonth = new Date().toISOString().slice(0, 7)
  const lastMonth = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 7)
  for (const c of contracts) {
    const wonBack = c.status === ContractStatus.WON_BACK
    if (!wonBack && c.status !== ContractStatus.ACTIVE) continue
    await db.commission.create({
      data: {
        contractId: c.id,
        userId: c.ownerId!,
        ruleId: wonBack ? ruleSave.id : ruleNeu.id,
        amountCents: wonBack ? 12000 : 7500,
        status: pick([
          CommissionStatus.PENDING,
          CommissionStatus.PENDING,
          CommissionStatus.APPROVED,
          CommissionStatus.PAID,
          CommissionStatus.PAID,
          CommissionStatus.CLAWBACK,
        ]),
        periodMonth: rnd() > 0.35 ? thisMonth : lastMonth,
      },
    })
  }

  // --- Challenges --------------------------------------------------------
  const challenges = await Promise.all([
    db.challenge.create({
      data: {
        title: 'Rückholjagd September',
        description: 'Wer holt die meisten gekündigten Verträge zurück?',
        metric: ChallengeMetric.CHURN_SAVED,
        target: 60,
        startsAt: daysAgo(7),
        endsAt: daysAhead(21),
        createdById: admin.id,
      },
    }),
    db.challenge.create({
      data: {
        title: '100 Gespräche',
        description: 'Team-Ziel: 100 geführte Gespräche in zwei Wochen.',
        metric: ChallengeMetric.CALLS_DONE,
        target: 100,
        startsAt: daysAgo(3),
        endsAt: daysAhead(11),
        createdById: admin.id,
      },
    }),
    db.challenge.create({
      data: {
        title: 'Glasfaser-Sprint',
        description: 'Neuverträge Glasfaser 1000 – läuft bis Quartalsende.',
        metric: ChallengeMetric.CONTRACTS_WON,
        target: 50,
        startsAt: daysAgo(20),
        endsAt: daysAhead(40),
        createdById: admin.id,
      },
    }),
  ])

  // --- Punkte-Ereignisse (tragen das Leaderboard) ------------------------
  for (const rep of reps) {
    const events = intBetween(18, 42)
    for (let k = 0; k < events; k++) {
      const kind = pick(['call_done', 'call_done', 'call_done', 'churn_saved', 'contract_won'])
      await db.pointsEvent.create({
        data: {
          userId: rep.id,
          challengeId: pick(challenges).id,
          kind,
          points: kind === 'call_done' ? 1 : kind === 'churn_saved' ? 15 : 10,
          occurredAt: daysAgo(intBetween(0, 27)),
        },
      })
    }
  }

  const counts = {
    teams: await db.team.count(),
    users: await db.user.count(),
    contracts: await db.contract.count(),
    activities: await db.churnActivity.count(),
    commissions: await db.commission.count(),
    challenges: await db.challenge.count(),
    pointsEvents: await db.pointsEvent.count(),
  }
  console.log('Seed fertig:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
