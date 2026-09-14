/**
 * Brutto-Netto-Rechner.
 *
 * Zweck: die eine Frage beantworten, die nach jeder Provisionsbuchung kommt –
 * "und was bleibt davon uebrig?". Deshalb rechnet dieses Modul nicht die
 * Provision allein, sondern den Aufschlag: einmal das Gehalt ohne Provision,
 * einmal mit, die Differenz ist das, was netto dazukommt. Provision allein zu
 * versteuern waere falsch, weil der Steuersatz am Gesamteinkommen haengt.
 *
 * ACHTUNG, GRENZE DES MODELLS: Das ist eine Schaetzung, keine Lohnabrechnung.
 * Nachgebildet sind der Einkommensteuertarif nach §32a EStG, die Vorsorge-
 * pauschale, Soli, Kirchensteuer und die vier Sozialversicherungszweige mit
 * ihren Beitragsbemessungsgrenzen. Nicht nachgebildet sind individuelle
 * Freibetraege aus den ELStAM, Sachbezuege, Einmalzahlungen als sonstiger
 * Bezug, betriebliche Altersvorsorge und die Sonderregeln fuer Sachsen
 * (dort traegt der Arbeitnehmer 0,5 Prozentpunkte mehr Pflegeversicherung).
 * Die Steuerklassen V und VI folgen der Naeherung aus §39b Abs. 2 Satz 7.
 *
 * Alle Betraege in Cent hinein, alle Betraege in Cent heraus.
 */

export type Steuerklasse = 1 | 2 | 3 | 4 | 5 | 6
export type Steuerjahr = 2025 | 2026

export const STEUERJAHRE: readonly Steuerjahr[] = [2026, 2025]
export const STEUERKLASSEN: readonly Steuerklasse[] = [1, 2, 3, 4, 5, 6]

type Tarif = {
  /** Grundfreibetrag und die drei weiteren Zonengrenzen aus §32a EStG. */
  grundfreibetrag: number
  zone2Ende: number
  zone3Ende: number
  zone4Ende: number
  a2: number
  b2: number
  a3: number
  b3: number
  c3: number
  d4: number
  d5: number

  /** Freigrenze der Jahres-Lohnsteuer, ab der ueberhaupt Soli anfaellt. */
  soliFreigrenze: number
  arbeitnehmerPauschbetrag: number
  sonderausgabenPauschbetrag: number
  entlastungAlleinerziehend: number
  /** Kinderfreibetrag plus BEA-Freibetrag je ganzem Kinderfreibetrag. */
  kinderfreibetrag: number

  bbgKvPv: number
  bbgRvAv: number
}

/**
 * Rechenwerte je Jahr. Sie stehen absichtlich als Tabelle hier und nicht
 * verteilt im Code: einmal im Jahr aendert der Gesetzgeber sie, und dann soll
 * genau ein Block angefasst werden muessen.
 */
const TARIFE: Record<Steuerjahr, Tarif> = {
  2026: {
    grundfreibetrag: 12_348,
    zone2Ende: 17_799,
    zone3Ende: 69_878,
    zone4Ende: 277_825,
    a2: 914.51,
    b2: 1_400,
    a3: 173.1,
    b3: 2_397,
    c3: 1_034.87,
    d4: 11_135.63,
    d5: 19_470.38,
    soliFreigrenze: 20_350,
    arbeitnehmerPauschbetrag: 1_230,
    sonderausgabenPauschbetrag: 36,
    entlastungAlleinerziehend: 4_260,
    kinderfreibetrag: 9_600,
    bbgKvPv: 69_750,
    bbgRvAv: 101_400,
  },
  2025: {
    grundfreibetrag: 12_096,
    zone2Ende: 17_443,
    zone3Ende: 68_480,
    zone4Ende: 277_825,
    a2: 932.3,
    b2: 1_400,
    a3: 176.64,
    b3: 2_397,
    c3: 1_015.13,
    d4: 10_911.92,
    d5: 19_246.67,
    soliFreigrenze: 19_950,
    arbeitnehmerPauschbetrag: 1_230,
    sonderausgabenPauschbetrag: 36,
    entlastungAlleinerziehend: 4_260,
    kinderfreibetrag: 9_600,
    bbgKvPv: 66_150,
    bbgRvAv: 96_600,
  },
}

/** Beitragssaetze der Sozialversicherung, Arbeitnehmeranteil. */
const SV = {
  kvAllgemein: 0.146,
  pvAllgemein: 0.036,
  rv: 0.186,
  av: 0.026,
  /** Zuschlag fuer Kinderlose ab 23 – den traegt der Arbeitnehmer allein. */
  pvKinderlosZuschlag: 0.006,
  /** Abschlag je Kind vom zweiten bis fuenften Kind unter 25. */
  pvKindAbschlag: 0.0025,
} as const

export type NettoEingabe = {
  /** Steuerpflichtiges Monatsbrutto in Cent, Provision eingeschlossen. */
  monatsBruttoCents: number
  steuerklasse: Steuerklasse
  /** 0, 8 oder 9 Prozent. Schleswig-Holstein liegt bei 9. */
  kirchensteuerProzent: number
  /** Kinderfreibetraege aus den ELStAM – halbe Betraege sind ueblich. */
  kinderfreibetraege: number
  /** Kinder unter 25; senkt den Pflegeversicherungsbeitrag ab dem zweiten. */
  kinder: number
  /** Zusatzbeitrag der Krankenkasse in Basispunkten: 290 = 2,90 Prozent. */
  kvZusatzBp: number
  jahr: Steuerjahr
}

export type NettoErgebnis = {
  bruttoCents: number
  lohnsteuerCents: number
  soliCents: number
  kirchensteuerCents: number
  kvCents: number
  pvCents: number
  rvCents: number
  avCents: number
  steuernCents: number
  sozialabgabenCents: number
  abzuegeCents: number
  nettoCents: number
  /** Anteil der Abzuege am Brutto, 0 bis 1. */
  abzugsQuote: number
}

/** Einkommensteuer nach §32a EStG auf ein zu versteuerndes Jahreseinkommen. */
export function einkommensteuer(zvEuro: number, jahr: Steuerjahr): number {
  const t = TARIFE[jahr]
  const x = Math.floor(Math.max(0, zvEuro))

  if (x <= t.grundfreibetrag) return 0
  if (x <= t.zone2Ende) {
    const y = (x - t.grundfreibetrag) / 10_000
    return Math.floor((t.a2 * y + t.b2) * y)
  }
  if (x <= t.zone3Ende) {
    const z = (x - t.zone2Ende) / 10_000
    return Math.floor((t.a3 * z + t.b3) * z + t.c3)
  }
  if (x <= t.zone4Ende) return Math.floor(0.42 * x - t.d4)
  return Math.floor(0.45 * x - t.d5)
}

/** Arbeitnehmeranteile der Sozialversicherung auf ein Jahresbrutto. */
function sozialabgaben(jahresBrutto: number, e: NettoEingabe) {
  const t = TARIFE[e.jahr]
  const basisKvPv = Math.min(jahresBrutto, t.bbgKvPv)
  const basisRvAv = Math.min(jahresBrutto, t.bbgRvAv)

  const kvSatz = SV.kvAllgemein / 2 + e.kvZusatzBp / 10_000 / 2
  const kinderAbschlag = Math.min(Math.max(e.kinder - 1, 0), 4) * SV.pvKindAbschlag
  const pvSatz = SV.pvAllgemein / 2 + (e.kinder === 0 ? SV.pvKinderlosZuschlag : -kinderAbschlag)

  return {
    kv: basisKvPv * kvSatz,
    pv: basisKvPv * Math.max(pvSatz, 0),
    rv: basisRvAv * (SV.rv / 2),
    av: basisRvAv * (SV.av / 2),
  }
}

/**
 * Vorsorgepauschale nach §39b Abs. 2 Nr. 3 EStG: der Teil der Sozialabgaben,
 * den das Lohnsteuerabzugsverfahren pauschal beruecksichtigt.
 */
function vorsorgepauschale(
  jahresBrutto: number,
  abgaben: ReturnType<typeof sozialabgaben>,
  e: NettoEingabe,
) {
  const rentenAnteil = abgaben.rv
  const krankenAnteil = abgaben.kv + abgaben.pv
  const mindest = Math.min(jahresBrutto * 0.12, e.steuerklasse === 3 ? 3_000 : 1_900)
  return Math.max(rentenAnteil + krankenAnteil, rentenAnteil + mindest)
}

/**
 * Lohnsteuer auf ein zu versteuerndes Jahreseinkommen, je Steuerklasse.
 * III splittet, V und VI folgen der Naeherung des Gesetzes: die Differenz des
 * Tarifs bei 1,25- und 0,75-fachem Einkommen, mindestens 14 Prozent.
 */
function lohnsteuerJahr(zvE: number, klasse: Steuerklasse, jahr: Steuerjahr) {
  if (zvE <= 0) return 0
  if (klasse === 3) return 2 * einkommensteuer(zvE / 2, jahr)
  if (klasse === 5 || klasse === 6) {
    const differenz = einkommensteuer(zvE * 1.25, jahr) - einkommensteuer(zvE * 0.75, jahr)
    return Math.max(differenz, Math.floor(zvE * 0.14))
  }
  return einkommensteuer(zvE, jahr)
}

export function berechneNetto(e: NettoEingabe): NettoErgebnis {
  const t = TARIFE[e.jahr]
  const jahresBrutto = (e.monatsBruttoCents * 12) / 100

  const abgaben = sozialabgaben(jahresBrutto, e)
  const sozialSumme = abgaben.kv + abgaben.pv + abgaben.rv + abgaben.av

  // Steuerklasse VI kennt weder Arbeitnehmer- noch Sonderausgaben-Pauschbetrag.
  const pauschbetraege =
    e.steuerklasse === 6 ? 0 : t.arbeitnehmerPauschbetrag + t.sonderausgabenPauschbetrag
  const entlastung = e.steuerklasse === 2 ? t.entlastungAlleinerziehend : 0
  const zvE = Math.max(
    0,
    jahresBrutto - pauschbetraege - entlastung - vorsorgepauschale(jahresBrutto, abgaben, e),
  )

  const lohnsteuer = lohnsteuerJahr(zvE, e.steuerklasse, e.jahr)

  // Soli und Kirchensteuer bemessen sich nach der Steuer, die mit Kinder-
  // freibetraegen faellig waere – auch wenn die Lohnsteuer selbst ohne sie
  // gerechnet wird. In den Klassen V und VI gibt es keine Freibetraege.
  const kfb = e.steuerklasse >= 5 ? 0 : e.kinderfreibetraege * t.kinderfreibetrag
  const bemessung =
    kfb > 0 ? lohnsteuerJahr(Math.max(0, zvE - kfb), e.steuerklasse, e.jahr) : lohnsteuer

  const freigrenze = e.steuerklasse === 3 ? t.soliFreigrenze * 2 : t.soliFreigrenze
  const soli =
    bemessung > freigrenze ? Math.min(bemessung * 0.055, (bemessung - freigrenze) * 0.119) : 0
  const kirchensteuer = (bemessung * e.kirchensteuerProzent) / 100

  const steuern = lohnsteuer + soli + kirchensteuer
  const netto = jahresBrutto - steuern - sozialSumme

  const proMonat = (jahresWert: number) => Math.round((jahresWert * 100) / 12)

  return {
    bruttoCents: e.monatsBruttoCents,
    lohnsteuerCents: proMonat(lohnsteuer),
    soliCents: proMonat(soli),
    kirchensteuerCents: proMonat(kirchensteuer),
    kvCents: proMonat(abgaben.kv),
    pvCents: proMonat(abgaben.pv),
    rvCents: proMonat(abgaben.rv),
    avCents: proMonat(abgaben.av),
    steuernCents: proMonat(steuern),
    sozialabgabenCents: proMonat(sozialSumme),
    abzuegeCents: proMonat(steuern + sozialSumme),
    nettoCents: proMonat(netto),
    abzugsQuote: jahresBrutto > 0 ? (steuern + sozialSumme) / jahresBrutto : 0,
  }
}

export type AufschlagEingabe = Omit<NettoEingabe, 'monatsBruttoCents'> & {
  grundgehaltCents: number
  provisionCents: number
}

export type AufschlagErgebnis = {
  ohne: NettoErgebnis
  mit: NettoErgebnis
  provisionBruttoCents: number
  provisionNettoCents: number
  /** Anteil der Provision, der uebrig bleibt – 0 bis 1. */
  nettoQuote: number
}

/**
 * Was von der Provision uebrig bleibt: Gehalt ohne und mit Provision rechnen,
 * die Differenz ist der Aufschlag. Das ist die ehrliche Zahl – der Grenzsteuer-
 * satz auf den letzten Euro liegt hoeher als der Durchschnittssatz.
 */
export function berechneAufschlag(e: AufschlagEingabe): AufschlagErgebnis {
  const basis = {
    steuerklasse: e.steuerklasse,
    kirchensteuerProzent: e.kirchensteuerProzent,
    kinderfreibetraege: e.kinderfreibetraege,
    kinder: e.kinder,
    kvZusatzBp: e.kvZusatzBp,
    jahr: e.jahr,
  }
  const ohne = berechneNetto({ ...basis, monatsBruttoCents: e.grundgehaltCents })
  const mit = berechneNetto({
    ...basis,
    monatsBruttoCents: e.grundgehaltCents + e.provisionCents,
  })
  const provisionNetto = mit.nettoCents - ohne.nettoCents

  return {
    ohne,
    mit,
    provisionBruttoCents: e.provisionCents,
    provisionNettoCents: provisionNetto,
    nettoQuote: e.provisionCents > 0 ? provisionNetto / e.provisionCents : 0,
  }
}
