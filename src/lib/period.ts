import { ausTeilen, monatKurz, monatsName, teile } from '@/lib/time'

/**
 * Abrechnungsperioden der Provision.
 *
 * Vorgabe aus dem Vertrieb: "Wir bekommen die Provision aus dem Monat davor
 * immer vom 20. zum 20." Daraus folgt der Zuschnitt, der hier gilt:
 *
 *   Periode "2026-09"  =  20.08.2026 00:00  bis  19.09.2026 24:00
 *   Auszahlung         =  20.10.2026 (eine Abrechnung spaeter)
 *
 * Eine Buchung vom 20. eines Monats gehoert also schon zur Periode des
 * Folgemonats. Der Katalog stuetzt das: "Entstandene Provisionsansprueche
 * werden im Folgemonat abgerechnet, ausgezahlt".
 *
 * Beide Zahlen stehen als Konstante hier und nirgends sonst. Wenn die
 * Lohnbuchhaltung einen anderen Stichtag oder einen anderen Verzug nennt,
 * ist das eine Zeile – nicht eine Suche durch die halbe Anwendung.
 */
export const STICHTAG = 20
export const AUSZAHLUNG_VERZUG_MONATE = 1

/** Periodenschluessel "2026-09" zu einem Vorgangszeitpunkt. */
export function periodeVon(d: Date) {
  const t = teile(d)
  const verschiebung = t.tag >= STICHTAG ? 1 : 0
  return schluessel(t.jahr, t.monat + verschiebung)
}

function schluessel(jahr: number, monat: number) {
  // Monat 13 ist Januar des Folgejahres.
  const j = jahr + Math.floor((monat - 1) / 12)
  const m = ((((monat - 1) % 12) + 12) % 12) + 1
  return `${j}-${String(m).padStart(2, '0')}`
}

function zerlege(periode: string) {
  const [jahr, monat] = periode.split('-').map(Number)
  if (!jahr || !monat) throw new Error(`Ungueltiger Periodenschluessel: ${periode}`)
  return { jahr, monat }
}

/** Zeitraum der Periode: von einschliesslich, bis ausschliesslich. */
export function periodenZeitraum(periode: string) {
  const { jahr, monat } = zerlege(periode)
  return {
    von: ausTeilen(jahr, monat - 1, STICHTAG),
    bis: ausTeilen(jahr, monat, STICHTAG),
  }
}

/** Tag, an dem diese Periode ausgezahlt wird. */
export function auszahlungsTag(periode: string) {
  const { jahr, monat } = zerlege(periode)
  return ausTeilen(jahr, monat + AUSZAHLUNG_VERZUG_MONATE, STICHTAG)
}

export function periodeDavor(periode: string) {
  const { jahr, monat } = zerlege(periode)
  return schluessel(jahr, monat - 1)
}

export function periodeDanach(periode: string) {
  const { jahr, monat } = zerlege(periode)
  return schluessel(jahr, monat + 1)
}

/** Die letzten n Perioden, neueste zuerst – Grundlage der Abgleich-Liste. */
export function letztePerioden(bis: string, anzahl: number) {
  const liste: string[] = []
  let p = bis
  for (let i = 0; i < anzahl; i++) {
    liste.push(p)
    p = periodeDavor(p)
  }
  return liste
}

/** "20.08. – 19.09.2026" */
export function periodenLabel(periode: string) {
  const { von, bis } = periodenZeitraum(periode)
  const v = teile(von)
  const letzterTag = teile(new Date(bis.getTime() - 86_400_000))
  const zwei = (n: number) => String(n).padStart(2, '0')
  return `${zwei(v.tag)}.${zwei(v.monat)}. – ${zwei(letzterTag.tag)}.${zwei(letzterTag.monat)}.${letzterTag.jahr}`
}

/** "September 2026" – der Name, unter dem die Periode im Team besprochen wird. */
export function periodenName(periode: string) {
  const { jahr, monat } = zerlege(periode)
  return `${monatsName(monat)} ${jahr}`
}

export function periodenNameKurz(periode: string) {
  return monatKurz(periode)
}

/**
 * Ist die Periode schon durch? Nur eine abgeschlossene Periode kann sinnvoll
 * gegen eine Auszahlung geprueft werden.
 */
export function periodeAbgeschlossen(periode: string, jetzt: Date) {
  return periodenZeitraum(periode).bis.getTime() <= jetzt.getTime()
}

/** Wie viele Tage der laufenden Periode sind vorbei, wie viele bleiben. */
export function periodenFortschritt(periode: string, jetzt: Date) {
  const { von, bis } = periodenZeitraum(periode)
  const gesamt = bis.getTime() - von.getTime()
  const vergangen = Math.min(Math.max(jetzt.getTime() - von.getTime(), 0), gesamt)
  return {
    prozent: Math.round((vergangen / gesamt) * 100),
    restTage: Math.max(0, Math.ceil((bis.getTime() - jetzt.getTime()) / 86_400_000)),
  }
}
