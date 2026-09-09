import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import type { Contract } from '@prisma/client'
import {
  PrismaClient,
  Role,
  ContractStatus,
  CancelReason,
  ActivityType,
  ActivityOutcome,
  CommissionCategory,
  CommissionStatus,
  ChallengeMetric,
  ObjectionCategory,
  SourceKind,
} from '@prisma/client'
import {
  CATALOG_CLAWBACK_DAYS,
  CATALOG_VALID_FROM,
  COMMISSION_CATALOG,
} from '../src/lib/commission-catalog'
import { OBJECTION_CATALOG } from '../src/lib/objection-catalog'
import { periodeDavor, periodeVon, periodenZeitraum } from '../src/lib/period'

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

/**
 * Der Provisionskatalog steht in src/lib/commission-catalog.ts und wird hier per
 * Upsert in die Datenbank geschrieben. Das laeuft VOR der Seed-Bremse, damit ein
 * geaenderter Satz auch dann ankommt, wenn die Demo-Daten stehen bleiben sollen.
 * Angefasst wird nur, was im Katalog steht – gebuchte Positionen bleiben.
 */
async function katalogSchreiben() {
  for (const [i, eintrag] of COMMISSION_CATALOG.entries()) {
    const daten = {
      name: eintrag.name,
      category: eintrag.category as CommissionCategory,
      variant: eintrag.variant ?? null,
      hint: eintrag.hint ?? null,
      amountCents: eintrag.amountCents,
      clawbackDays: CATALOG_CLAWBACK_DAYS,
      sortOrder: i,
      active: true,
      validFrom: CATALOG_VALID_FROM,
    }
    await db.commissionRule.upsert({
      where: { key: eintrag.key },
      update: daten,
      create: { key: eintrag.key, ...daten },
    })
  }
  console.log(`Provisionskatalog: ${COMMISSION_CATALOG.length} Saetze geschrieben.`)
}

/**
 * Startbestand der Einwand-Wiki.
 *
 * Anders als der Provisionskatalog ist das keine Preisliste, sondern ein
 * Anfang – die Wiki gehoert nach dem ersten Tag dem Team. Deshalb die
 * Zwischenstufe: Fehlende Eintraege werden angelegt, und ein Starteintrag wird
 * nur solange aufgefrischt, wie ihn niemand angefasst hat (`edited = false`).
 * Sobald jemand ihn ueber die Oberflaeche ueberarbeitet, bleibt seine Fassung
 * stehen, auch wenn der Katalog sich weiterentwickelt. „Hat geholfen" und das
 * Archivieren zaehlen dabei nicht als Anfassen.
 */
async function wikiSchreiben() {
  const vorhanden = new Set(
    (await db.objection.findMany({ where: { key: { not: null } }, select: { key: true } })).map(
      (e) => e.key,
    ),
  )

  let angelegt = 0
  let aufgefrischt = 0
  for (const eintrag of OBJECTION_CATALOG) {
    const daten = {
      title: eintrag.title,
      category: eintrag.category as ObjectionCategory,
      variants: [...eintrag.variants],
      answer: eintrag.answer,
      followUp: eintrag.followUp ?? null,
      tags: [...eintrag.tags],
    }

    if (!vorhanden.has(eintrag.key)) {
      await db.objection.create({ data: { key: eintrag.key, ...daten } })
      angelegt++
      continue
    }

    const { count } = await db.objection.updateMany({
      where: { key: eintrag.key, edited: false },
      data: daten,
    })
    aufgefrischt += count
  }

  console.log(
    `Einwand-Wiki: ${angelegt} neu, ${aufgefrischt} aufgefrischt, ` +
      `${vorhanden.size - aufgefrischt} vom Team uebernommen.`,
  )
}

async function main() {
  // Der Katalog ist keine Demo-Beilage, sondern die Preisliste – er wird immer
  // aktualisiert, auch wenn die Bremse gleich abbricht. Der Startbestand der
  // Wiki laeuft aus demselben Grund hier oben mit: sonst stuende sie auf einer
  // bereits befuellten Datenbank leer da.
  await katalogSchreiben()
  await wikiSchreiben()

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
  await db.commissionPayout.deleteMany()
  await db.churnActivity.deleteMany()
  await db.contract.deleteMany()
  await db.importBatch.deleteMany()
  // Der Katalog bleibt stehen – nur Regeln, die nicht mehr in ihm vorkommen
  // (Platzhalter aus Stage 1), fliegen raus.
  await db.commissionRule.deleteMany({
    where: { key: { notIn: COMMISSION_CATALOG.map((e) => e.key) } },
  })
  await db.challenge.deleteMany()
  // Selbst angelegte Wiki-Eintraege sind Demo-Daten und fliegen raus. Der
  // Startbestand (mit key) bleibt – er wurde eben erst sichergestellt.
  await db.objection.deleteMany({ where: { key: null } })
  await db.userSettings.deleteMany()
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
    jobTitle: string
    role: Role
    teamId: string
  }[] = [
    {
      email: 'admin@tng.de',
      displayName: 'Sam Ausbilder',
      jobTitle: 'Teamleitung Vertrieb',
      role: Role.ADMIN,
      teamId: teamNord.id,
    },
    {
      email: 'rep@tng.de',
      displayName: 'Kevin (Azubi)',
      jobTitle: 'Auszubildender KDM',
      role: Role.REP,
      teamId: teamNord.id,
    },
    {
      email: 'jo@tng.de',
      displayName: 'Jo Berger',
      jobTitle: 'Vertrieb Innendienst',
      role: Role.REP,
      teamId: teamNord.id,
    },
    {
      email: 'mika@tng.de',
      displayName: 'Mika Falk',
      jobTitle: 'Vertrieb Innendienst',
      role: Role.REP,
      teamId: teamSued.id,
    },
    {
      email: 'toni@tng.de',
      displayName: 'Toni Kraus',
      jobTitle: 'Vertrieb Aussendienst',
      role: Role.REP,
      teamId: teamSued.id,
    },
    {
      email: 'ren@tng.de',
      displayName: 'Ren Ahrens',
      jobTitle: 'Vertrieb Innendienst',
      role: Role.REP,
      teamId: teamSued.id,
    },
  ]
  // Kein Profilbild im Seed: das laedt jede und jeder selbst hoch, und
  // erfundene Portraets waeren das eine Stueck Demo-Daten, das nach echten
  // Menschen aussieht.

  const users = []
  for (const p of people) {
    users.push(await db.user.create({ data: { ...p, passwordHash: password } }))
  }
  const reps = users.filter((u) => u.role === Role.REP)
  const admin = users[0]!

  // --- Einstellungen je Nutzer (Wochenstunden + Steuermerkmale) ----------
  // Erfundene, aber realistische Werte, damit der Brutto-Netto-Rechner und die
  // Stundenauswertung in der Demo etwas zu rechnen haben.
  const einstellungen: Record<string, { std: number; gehalt: number; klasse: number }> = {
    'admin@tng.de': { std: 40, gehalt: 420_000, klasse: 3 },
    'rep@tng.de': { std: 38.5, gehalt: 115_000, klasse: 1 },
    'jo@tng.de': { std: 40, gehalt: 285_000, klasse: 1 },
    'mika@tng.de': { std: 30, gehalt: 215_000, klasse: 4 },
    'toni@tng.de': { std: 40, gehalt: 290_000, klasse: 1 },
    'ren@tng.de': { std: 25, gehalt: 180_000, klasse: 2 },
  }
  for (const u of users) {
    const e = einstellungen[u.email] ?? { std: 40, gehalt: 250_000, klasse: 1 }
    await db.userSettings.create({
      data: {
        userId: u.id,
        weeklyHours: e.std,
        workDaysPerWeek: e.std <= 30 ? 4 : 5,
        baseSalaryCents: e.gehalt,
        taxClass: e.klasse,
        churchTaxPercent: 9,
        children: 0,
        healthExtraRateBp: 290,
        taxYear: 2026,
      },
    })
  }

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

  const contracts: Contract[] = []
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

  // --- Provisionsbuchungen -----------------------------------------------
  // So, wie sie im Tracker entstehen: viele kleine Kampagnen-Vorgaenge, dazwischen
  // ein Vertragsabschluss. Die Haeufigkeit bildet den Alltag der Vertragsnach-
  // bearbeitung nach – Welcome Calls sind Massengeschaeft, Business-Abschluesse
  // die Ausnahme.
  const regeln = await db.commissionRule.findMany({ where: { active: true } })
  const regelJeKey = new Map(regeln.map((r) => [r.key, r]))
  const HAEUFIGKEIT: Record<string, number> = {
    'welcome-calls': 26,
    courtesy: 18,
    dupecheck: 10,
    'churn-kuendigung': 8,
    'churn-bau': 6,
    'churn-widerruf': 5,
    'churn-postrueck': 7,
    'tw-upgrade-rest-lt3': 4,
    'tw-upgrade-ausserhalb': 3,
    'tw-sidegrade-rest-lt3': 3,
    'tw-sidegrade-ausserhalb': 2,
    'winback-privat': 3,
    flott300: 2,
    flott500: 1,
    surf1000: 2,
    smart1000: 2,
    fibrefamily: 2,
    fibrepro: 1,
    max1000: 1,
    'waipu-tv': 2,
    'lte-komplett-5g': 1,
    'lte-smart-5g': 1,
    'business-basic1000': 1,
  }
  const topf: string[] = []
  for (const [key, gewicht] of Object.entries(HAEUFIGKEIT)) {
    if (!regelJeKey.has(key)) continue
    for (let i = 0; i < gewicht; i++) topf.push(key)
  }

  const jetzt = new Date()
  const laufendePeriode = periodeVon(jetzt)
  // Fuenf Perioden zurueck: genug fuer Quartals- und Jahresschnitt in der Auswertung.
  const perioden = [
    periodeDavor(periodeDavor(periodeDavor(periodeDavor(laufendePeriode)))),
    periodeDavor(periodeDavor(periodeDavor(laufendePeriode))),
    periodeDavor(periodeDavor(laufendePeriode)),
    periodeDavor(laufendePeriode),
    laufendePeriode,
  ]
  // Der Ausbilder bucht selbst nur wenig, soll in der Demo aber nicht mit einer
  // leeren Auswertung dastehen.
  const buchende = users
  const vertraegeJeRep = new Map(
    buchende.map((r) => [r.id, contracts.filter((c) => c.ownerId === r.id)]),
  )

  let gebucht = 0
  for (const periode of perioden) {
    const { von, bis } = periodenZeitraum(periode)
    const laeuft = periode === laufendePeriode
    const ende = Math.min(bis.getTime(), jetzt.getTime())
    const tage = Math.max(1, Math.round((ende - von.getTime()) / 86_400_000))

    for (const rep of buchende) {
      // Kevin ist der Demo-Login und soll die vollste Liste haben.
      const proTag = rep.email === 'rep@tng.de' ? 2.6 : rep.role === Role.ADMIN ? 0.5 : 1.4
      const anzahl = Math.round(tage * proTag * (0.7 + rnd() * 0.6))

      for (let i = 0; i < anzahl; i++) {
        const key = pick(topf)
        const regel = regelJeKey.get(key)!
        // Buchungen fallen auf Werktage, verteilt ueber den Zeitraum.
        const versatz = Math.floor(rnd() * tage)
        const zeitpunkt = new Date(
          von.getTime() + versatz * 86_400_000 + (8 + rnd() * 9) * 3_600_000,
        )
        if ([0, 6].includes(zeitpunkt.getUTCDay())) continue

        // Alte Perioden sind abgerechnet, die laufende ist noch offen.
        const status = laeuft
          ? pick([CommissionStatus.PENDING, CommissionStatus.PENDING, CommissionStatus.APPROVED])
          : pick([
              CommissionStatus.PAID,
              CommissionStatus.PAID,
              CommissionStatus.PAID,
              CommissionStatus.PAID,
              CommissionStatus.PAID,
              CommissionStatus.CLAWBACK,
            ])

        // Ein Teil der Buchungen haengt an einem Vertrag aus der Liste, der Rest
        // traegt nur die getippte Vertragsnummer – so laeuft es im Alltag auch.
        const eigene = vertraegeJeRep.get(rep.id) ?? []
        const vertrag = eigene.length > 0 && rnd() > 0.55 ? pick(eigene) : null

        await db.commission.create({
          data: {
            contractId: vertrag?.id ?? null,
            externalRef: vertrag ? null : rnd() > 0.5 ? `V-2026-${intBetween(10000, 99999)}` : null,
            userId: rep.id,
            ruleId: regel.id,
            amountCents: regel.amountCents ?? 0,
            status,
            periodMonth: periode,
            occurredAt: zeitpunkt,
            createdAt: zeitpunkt,
          },
        })
        gebucht++
      }
    }
  }

  // --- Auszahlungen, wie sie geprueft werden ------------------------------
  // Zwei abgeschlossene Perioden fuer den Demo-Login: eine stimmt auf den Cent,
  // bei der aelteren fehlen ein paar Euro – genau der Fall, fuer den es den
  // Abgleich gibt.
  const kevin = users.find((u) => u.email === 'rep@tng.de')!
  const geprueft = [perioden[perioden.length - 3]!, perioden[perioden.length - 2]!]
  for (const [index, periode] of geprueft.entries()) {
    const summe = await db.commission.aggregate({
      _sum: { amountCents: true },
      where: { userId: kevin.id, periodMonth: periode, status: { not: CommissionStatus.CLAWBACK } },
    })
    const erwartet = summe._sum.amountCents ?? 0
    await db.commissionPayout.create({
      data: {
        userId: kevin.id,
        periodKey: periode,
        // Die aeltere Auszahlung liegt daneben, die juengere passt.
        paidCents: index === 0 ? Math.max(0, erwartet - 1150) : erwartet,
        paidOn: new Date(periodenZeitraum(periode).bis.getTime() + 31 * 86_400_000),
        note: index === 0 ? 'Differenz noch nicht geklärt – Rückfrage läuft.' : null,
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

  // --- Einwand-Wiki: Spuren aus dem Alltag -------------------------------
  // Der Startbestand steht schon (siehe wikiSchreiben). Hier kommt nur dazu,
  // was im Betrieb entsteht: Rueckmeldungen aus Gespraechen und zwei Eintraege,
  // die jemand selbst geschrieben hat.
  const wikiEintraege = await db.objection.findMany({ select: { id: true } })
  for (const eintrag of wikiEintraege) {
    await db.objection.update({
      where: { id: eintrag.id },
      // Die meisten Eintraege werden ein paar Mal gebraucht, einzelne oft –
      // damit die Sortierung "bewaehrte zuerst" in der Demo etwas zeigt.
      data: { helpful: rnd() > 0.75 ? intBetween(9, 24) : intBetween(0, 6) },
    })
  }

  const kevinWiki = users.find((u) => u.email === 'rep@tng.de')!
  await db.objection.createMany({
    data: [
      {
        title: 'Ich habe gerade erst verlängert',
        category: ObjectionCategory.CONTRACT,
        variants: [
          'ich bin noch bis nächstes Jahr gebunden',
          'der Vertrag läuft doch noch',
          'da komme ich jetzt nicht raus',
        ],
        answer:
          'Genau deshalb rufe ich an – solange der Vertrag läuft, haben wir Zeit und müssen nichts überstürzen.\nIch merke Ihren Anschluss für den Ausbau vor.\nRechtzeitig vor Ihrer Kündigungsfrist melde ich mich wieder.\nDann liegt alles bereit, und Sie verpassen die Frist nicht.',
        followUp: 'Wann genau läuft Ihr Vertrag aus – wissen Sie das Datum?',
        tags: ['Laufzeit', 'Wiedervorlage', 'Frist'],
        helpful: 11,
        authorId: kevinWiki.id,
      },
      {
        title: 'Am Hörer klingt der Kunde genervt, bevor ich etwas sagen kann',
        category: ObjectionCategory.OTHER,
        variants: ['sofort patzig', 'was wollen Sie schon wieder', 'nicht schon wieder ein Anruf'],
        answer:
          'Ich höre, das ist heute nicht der erste Anruf – ich mache es kurz.\nNicht dagegenreden, sondern den Ton aufnehmen: Tempo raus, Stimme runter.\nDanach eine Frage stellen, die nichts verkauft.\nWer antwortet, hört auf sich zu wehren.',
        followUp: 'Sagen Sie mir kurz: Läuft Ihr Anschluss gerade so, wie er soll?',
        tags: ['Gesprächseinstieg', 'Ton', 'Deeskalation'],
        helpful: 7,
        authorId: kevinWiki.id,
      },
    ],
  })

  const counts = {
    teams: await db.team.count(),
    users: await db.user.count(),
    contracts: await db.contract.count(),
    activities: await db.churnActivity.count(),
    commissions: await db.commission.count(),
    commissionRules: await db.commissionRule.count(),
    payouts: await db.commissionPayout.count(),
    challenges: await db.challenge.count(),
    pointsEvents: await db.pointsEvent.count(),
    objections: await db.objection.count(),
  }
  console.log(`Provisionsbuchungen im Tracker-Stil: ${gebucht}`)
  console.log('Seed fertig:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
