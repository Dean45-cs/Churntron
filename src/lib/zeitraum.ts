import {
  STICHTAG,
  auszahlungsTag,
  periodeAbgeschlossen,
  periodeDavor,
  periodenLabel,
  periodenName,
  periodenZeitraum,
  periodeVon,
} from '@/lib/period'
import {
  monatsGrenzen,
  monatsName,
  monatsSchluessel,
  monatsSchluesselAus,
  monatsTeile,
  spanneLabel,
} from '@/lib/time'

/**
 * Ein Monat, zwei Zuschnitte.
 *
 * Im Vertrieb werden dieselben Buchungen auf zwei Arten gezaehlt, und beide
 * sind richtig:
 *
 *   Kalendermonat        01.09. – 30.09.  "Was habe ich im September gemacht?"
 *   Abrechnungszeitraum  20.08. – 19.09.  "Was steht auf der naechsten Abrechnung?"
 *
 * Vorher zeigte der Tracker nur den Abrechnungszeitraum und die Auswertung nur
 * den Kalendermonat – zwei verschiedene Zahlen fuer denselben "Monat", ohne dass
 * die Oberflaeche dazusagte, welche gerade gemeint ist. Genau daran ist der
 * Abgleich gescheitert.
 *
 * Deshalb gibt es hier eine Sicht auf beide: Schluessel, Grenzen, Beschriftung
 * und Fortschritt laufen ueber dieselben Funktionen, nur `art` unterscheidet.
 * Beide Zuschnitte tragen denselben Schluessel "2026-09" – der Kalendermonat,
 * weil der Vorgang im September liegt, die Periode, weil sie im September
 * endet und im Oktober abgerechnet wird.
 *
 * Der Stichtag selbst steht weiterhin nur in `period.ts`.
 */

export type Zeitraumart = 'monat' | 'periode'

export const ZEITRAUM_ARTEN: Zeitraumart[] = ['monat', 'periode']

/** Die volle Bezeichnung – ueberall dort, wo Platz fuer sie ist. */
export const ZEITRAUM_LABEL: Record<Zeitraumart, string> = {
  monat: 'Kalendermonat',
  periode: 'Abrechnungszeitraum',
}

/** Fuer Kacheln und Reiter, wo die lange Form die Zeile sprengt. */
export const ZEITRAUM_KURZ: Record<Zeitraumart, string> = {
  monat: 'Monat',
  periode: 'Abrechnung',
}

export const ZEITRAUM_ERKLAERUNG: Record<Zeitraumart, string> = {
  monat: 'vom 1. bis zum Monatsende',
  periode: `vom ${STICHTAG}. bis zum ${STICHTAG - 1}. des Folgemonats`,
}

export function istZeitraumart(wert: unknown): wert is Zeitraumart {
  return wert === 'monat' || wert === 'periode'
}

/** In welchen Zeitraum dieser Art faellt ein Vorgang? */
export function zeitraumVon(art: Zeitraumart, d: Date) {
  return art === 'periode' ? periodeVon(d) : monatsSchluessel(d)
}

/** Grenzen des Zeitraums: von einschliesslich, bis ausschliesslich. */
export function zeitraumGrenzen(art: Zeitraumart, schluessel: string) {
  return art === 'periode' ? periodenZeitraum(schluessel) : monatsGrenzen(schluessel)
}

/** "September 2026" – bei beiden Arten derselbe Name, die Spanne trennt sie. */
export function zeitraumName(art: Zeitraumart, schluessel: string) {
  if (art === 'periode') return periodenName(schluessel)
  const { jahr, monat } = monatsTeile(schluessel)
  return `${monatsName(monat)} ${jahr}`
}

/** "01.09. – 30.09.2026" bzw. "20.08. – 19.09.2026" */
export function zeitraumSpanne(art: Zeitraumart, schluessel: string) {
  if (art === 'periode') return periodenLabel(schluessel)
  const { von, bis } = monatsGrenzen(schluessel)
  return spanneLabel(von, bis)
}

export function zeitraumDavor(art: Zeitraumart, schluessel: string) {
  if (art === 'periode') return periodeDavor(schluessel)
  const { jahr, monat } = monatsTeile(schluessel)
  return monatsSchluesselAus(jahr, monat - 1)
}

/** Die letzten n Zeitraeume, neueste zuerst. */
export function letzteZeitraeume(art: Zeitraumart, bis: string, anzahl: number) {
  const liste: string[] = []
  let s = bis
  for (let i = 0; i < anzahl; i++) {
    liste.push(s)
    s = zeitraumDavor(art, s)
  }
  return liste
}

export function zeitraumAbgeschlossen(art: Zeitraumart, schluessel: string, jetzt: Date) {
  if (art === 'periode') return periodeAbgeschlossen(schluessel, jetzt)
  return monatsGrenzen(schluessel).bis.getTime() <= jetzt.getTime()
}

/** Wie viel des Zeitraums ist vorbei, wie viele Tage bleiben. */
export function zeitraumFortschritt(art: Zeitraumart, schluessel: string, jetzt: Date) {
  const { von, bis } = zeitraumGrenzen(art, schluessel)
  const gesamt = bis.getTime() - von.getTime()
  const vergangen = Math.min(Math.max(jetzt.getTime() - von.getTime(), 0), gesamt)
  return {
    prozent: Math.round((vergangen / gesamt) * 100),
    restTage: Math.max(0, Math.ceil((bis.getTime() - jetzt.getTime()) / 86_400_000)),
  }
}

/**
 * Alles, was eine Komponente ueber den laufenden Zeitraum wissen muss – fertig
 * beschriftet. Nach der Regel aus AGENTS.md bekommt die Oberflaeche Text und
 * Zahlen, keine Zeitstempel zum Vergleichen.
 */
export type ZeitraumStand = {
  art: Zeitraumart
  schluessel: string
  /** "Kalendermonat" bzw. "Abrechnungszeitraum" */
  artLabel: string
  /** "September 2026" */
  name: string
  /** "01.09. – 30.09.2026" */
  spanne: string
  prozent: number
  restTage: number
}

export function zeitraumStand(art: Zeitraumart, jetzt: Date, schluessel?: string): ZeitraumStand {
  const s = schluessel ?? zeitraumVon(art, jetzt)
  const { prozent, restTage } = zeitraumFortschritt(art, s, jetzt)
  return {
    art,
    schluessel: s,
    artLabel: ZEITRAUM_LABEL[art],
    name: zeitraumName(art, s),
    spanne: zeitraumSpanne(art, s),
    prozent,
    restTage,
  }
}

/** Wann der Abrechnungszeitraum ausgezahlt wird – beim Kalendermonat: nie. */
export function zeitraumAuszahlung(art: Zeitraumart, schluessel: string) {
  return art === 'periode' ? auszahlungsTag(schluessel) : null
}
