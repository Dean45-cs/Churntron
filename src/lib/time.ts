/**
 * Zeitrechnung in der Zeitzone, in der gearbeitet wird.
 *
 * Warum nicht einfach `new Date().getDate()`: Der Server laeuft in UTC
 * (Vercel tut das), die Vertriebler sitzen in Deutschland. Eine Buchung um
 * 00:30 Uhr deutscher Zeit wuerde sonst auf den Vortag rutschen – und genau
 * "was habe ich heute verdient" ist die Frage, die dieses Modul beantworten
 * koennen muss. Deshalb laufen alle Tages-, Wochen- und Monatsgrenzen ueber
 * Europe/Berlin, nicht ueber die Serverzeit.
 *
 * Ohne Bibliothek: Intl kennt die Zeitzonendatenbank, das reicht.
 */

export const ZEITZONE = 'Europe/Berlin'

const TEILE = new Intl.DateTimeFormat('en-US', {
  timeZone: ZEITZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
})

const WOCHENTAG: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

export type ZeitTeile = {
  jahr: number
  monat: number
  tag: number
  stunde: number
  minute: number
  sekunde: number
  /** 1 = Montag … 7 = Sonntag */
  wochentag: number
}

/** Die Wanduhrzeit in Deutschland zu einem Zeitpunkt. */
export function teile(d: Date): ZeitTeile {
  const p = Object.fromEntries(TEILE.formatToParts(d).map((x) => [x.type, x.value]))
  return {
    jahr: Number(p.year),
    monat: Number(p.month),
    tag: Number(p.day),
    // Mitternacht meldet Intl je nach Laufzeit als 24 – das waere der Folgetag.
    stunde: Number(p.hour) % 24,
    minute: Number(p.minute),
    sekunde: Number(p.second),
    wochentag: WOCHENTAG[p.weekday ?? 'Mon'] ?? 1,
  }
}

/** Verschiebung zwischen deutscher Wanduhr und UTC zu diesem Zeitpunkt. */
function versatzMs(d: Date) {
  const t = teile(d)
  return Date.UTC(t.jahr, t.monat - 1, t.tag, t.stunde, t.minute, t.sekunde) - d.getTime()
}

/**
 * Deutsche Wanduhrzeit -> echter Zeitpunkt. Zwei Durchgaenge, weil der Versatz
 * selbst vom Ergebnis abhaengt: an den beiden Umstellungstagen im Jahr liegt
 * der erste Schaetzwert sonst eine Stunde daneben.
 *
 * Ueberlaeufe sind erlaubt: Monat 13 wird Januar, Tag 32 der Folgemonat.
 */
export function ausTeilen(jahr: number, monat: number, tag: number, stunde = 0, minute = 0) {
  const schaetzung = Date.UTC(jahr, monat - 1, tag, stunde, minute, 0)
  const v1 = versatzMs(new Date(schaetzung))
  const v2 = versatzMs(new Date(schaetzung - v1))
  return new Date(schaetzung - v2)
}

export function tagesBeginn(d: Date) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat, t.tag)
}

/** Beginn des naechsten Tages – als obere, ausschliessende Grenze gedacht. */
export function tagesEnde(d: Date) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat, t.tag + 1)
}

/** Montag 00:00 der Woche, in der d liegt. */
export function wochenBeginn(d: Date) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat, t.tag - (t.wochentag - 1))
}

export function monatsBeginn(d: Date) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat, 1)
}

export function quartalsBeginn(d: Date) {
  const t = teile(d)
  return ausTeilen(t.jahr, Math.floor((t.monat - 1) / 3) * 3 + 1, 1)
}

export function jahresBeginn(d: Date) {
  return ausTeilen(teile(d).jahr, 1, 1)
}

export function plusTage(d: Date, n: number) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat, t.tag + n, t.stunde, t.minute)
}

export function plusMonate(d: Date, n: number) {
  const t = teile(d)
  return ausTeilen(t.jahr, t.monat + n, t.tag, t.stunde, t.minute)
}

/** Tagesschluessel "2026-09-08" nach deutscher Zeit – zum Gruppieren. */
export function tagesSchluessel(d: Date) {
  const t = teile(d)
  return `${t.jahr}-${String(t.monat).padStart(2, '0')}-${String(t.tag).padStart(2, '0')}`
}

/** Monatsschluessel "2026-09" nach deutscher Zeit. */
export function monatsSchluessel(d: Date) {
  const t = teile(d)
  return `${t.jahr}-${String(t.monat).padStart(2, '0')}`
}

/**
 * Monatsschluessel aus Jahr und Monat. Ueberlaeufe sind erlaubt und gewollt:
 * Monat 13 ist Januar des Folgejahres, Monat 0 der Dezember davor. Damit
 * rechnen Kalendermonat und Abrechnungsperiode mit derselben Arithmetik.
 */
export function monatsSchluesselAus(jahr: number, monat: number) {
  const j = jahr + Math.floor((monat - 1) / 12)
  const m = ((((monat - 1) % 12) + 12) % 12) + 1
  return `${j}-${String(m).padStart(2, '0')}`
}

export function monatsTeile(schluessel: string) {
  const [jahr, monat] = schluessel.split('-').map(Number)
  if (!jahr || !monat) throw new Error(`Ungueltiger Monatsschluessel: ${schluessel}`)
  return { jahr, monat }
}

/** Der Kalendermonat: vom 1. bis zum 1. des Folgemonats (bis ausschliesslich). */
export function monatsGrenzen(schluessel: string) {
  const { jahr, monat } = monatsTeile(schluessel)
  return { von: ausTeilen(jahr, monat, 1), bis: ausTeilen(jahr, monat + 1, 1) }
}

/**
 * "01.09. – 30.09.2026" – beide Randtage, das Jahr nur einmal am Ende.
 *
 * `bis` ist die ausschliessende obere Grenze; beschriftet wird der Tag davor.
 * Der geht ueber `plusTage` und nicht ueber "minus 86.400.000", damit an den
 * beiden Umstellungstagen im Jahr nicht 23 oder 25 Stunden gerechnet werden.
 */
export function spanneLabel(von: Date, bis: Date) {
  const v = teile(von)
  const letzter = teile(plusTage(bis, -1))
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${zwei(v.tag)}.${zwei(v.monat)}. – ${zwei(letzter.tag)}.${zwei(letzter.monat)}.${letzter.jahr}`
}

const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const

export function monatsName(monat: number) {
  return MONATE[(monat - 1) % 12] ?? ''
}

/** "Sep 2026" – kurz genug fuer eine Balkenachse. */
export function monatKurz(schluessel: string) {
  const [jahr, monat] = schluessel.split('-').map(Number)
  return `${monatsName(monat ?? 1).slice(0, 3)} ${jahr}`
}

/** Angefangene Kalendertage zwischen zwei Zeitpunkten, mindestens 1. */
export function tageZwischen(von: Date, bis: Date) {
  const ms = tagesBeginn(bis).getTime() - tagesBeginn(von).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}
