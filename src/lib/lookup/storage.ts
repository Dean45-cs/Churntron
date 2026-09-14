/**
 * Der Schichtstand: was in dieser Schicht abgehakt, ausgefuellt und notiert
 * wurde. Er liegt im localStorage des Browsers – und nur dort.
 *
 * Das ist keine Bequemlichkeit, sondern die Umsetzung der Grundregel aus
 * AGENTS.md: Die Liste von PP traegt Klardaten. Sie wird im Browser gelesen,
 * im Browser durchsucht und im Browser wieder ausgegeben. Es gibt keinen
 * Server-Weg – kein fetch, keine Server Action, kein Prisma.
 *
 * Der Schluessel je Datensatz kommt aus `recKey()` und ist damit an die
 * Vertrags- bzw. Kundennummer gebunden, nicht an die Zeilennummer: eine neue
 * Liste am naechsten Tag findet die Markierungen von gestern wieder.
 */

import type { FormularStand, StatusWert } from './types'

/**
 * Dieselben Schluessel wie im alten Kampagnen-Lookup. Die Daten wandern zwar
 * nicht mit (anderer Origin), aber wer beide Werkzeuge kennt, findet im
 * Browser-Speicher dieselben Namen wieder.
 */
const KEY_STATUS = 'tng_lookup_status_v1'
const KEY_FORMS = 'tng_lookup_forms_v1'
const KEY_TS = 'tng_lookup_ts_v1'
/** Neu in Churntron: die internen Notizen. */
const KEY_NOTIZEN = 'tng_lookup_notes_v1'

export type Schichtstand = {
  statusMap: Record<string, StatusWert>
  formMap: Record<string, FormularStand>
  /** Zeitpunkt der letzten Aenderung je Datensatz – Spalte "Bearbeitet_am". */
  tsMap: Record<string, number>
  /** Freitext je Datensatz. Bleibt intern, siehe export.ts. */
  notizMap: Record<string, string>
}

export function leererStand(): Schichtstand {
  return { statusMap: {}, formMap: {}, tsMap: {}, notizMap: {} }
}

function lies<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {}
  try {
    const roh = window.localStorage.getItem(key)
    if (!roh) return {}
    const wert: unknown = JSON.parse(roh)
    // Kein Array, kein null, kein String: nur ein Objekt ist ein gueltiger Stand.
    if (!wert || typeof wert !== 'object' || Array.isArray(wert)) return {}
    return wert as Record<string, T>
  } catch {
    // Privater Modus, volles Kontingent, kaputter Eintrag – kein Grund,
    // die Schicht abzubrechen. Dann eben ohne gemerkten Stand.
    return {}
  }
}

function schreib(key: string, wert: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(wert))
  } catch {
    /* siehe oben */
  }
}

export function ladeStand(): Schichtstand {
  return {
    statusMap: lies<StatusWert>(KEY_STATUS),
    formMap: lies<FormularStand>(KEY_FORMS),
    tsMap: lies<number>(KEY_TS),
    notizMap: lies<string>(KEY_NOTIZEN),
  }
}

export function speichereStand(stand: Schichtstand) {
  schreib(KEY_STATUS, stand.statusMap)
  schreib(KEY_FORMS, stand.formMap)
  schreib(KEY_TS, stand.tsMap)
  schreib(KEY_NOTIZEN, stand.notizMap)
}

/* ---------------------------------------------------------------------------
   Der Stand als externer Speicher
   ---------------------------------------------------------------------------
   Der localStorage ist nichts, was React gehoert: er existiert vor der ersten
   Anzeige und ueberlebt sie. Deshalb haengt die Oberflaeche ueber
   `useSyncExternalStore` daran, statt ihn in einem Effekt nachzuladen.

   Das loest zugleich zwei Probleme auf einmal: Beim Rendern auf dem Server
   gibt es keinen localStorage – `serverStand()` liefert dort einen leeren,
   immer gleichen Stand, und React tauscht ihn nach dem Hydrieren gegen den
   echten aus. Ohne das gaebe es entweder einen Hydration-Fehler oder einen
   zweiten Renderdurchlauf, den der Regelsatz `react-hooks/set-state-in-effect`
   zu Recht anmerkt.
   --------------------------------------------------------------------------- */

/** Muss zwischen zwei Aenderungen dieselbe Referenz liefern, sonst rendert React endlos. */
let zwischenspeicher: Schichtstand | null = null
const hoerer = new Set<() => void>()

/** Auf dem Server gibt es nichts zu merken – eine feste, leere Antwort. */
const SERVER_STAND: Schichtstand = Object.freeze(leererStand())

export function serverStand(): Schichtstand {
  return SERVER_STAND
}

export function aktuellerStand(): Schichtstand {
  zwischenspeicher ??= ladeStand()
  return zwischenspeicher
}

export function abonniereStand(fn: () => void): () => void {
  hoerer.add(fn)
  return () => {
    hoerer.delete(fn)
  }
}

/** Stand aendern, sofort sichern, Oberflaeche benachrichtigen. */
export function aendereStand(f: (alt: Schichtstand) => Schichtstand) {
  const neu = f(aktuellerStand())
  zwischenspeicher = neu
  speichereStand(neu)
  hoerer.forEach((fn) => fn())
}

/** Nur fuer Tests: den Zwischenspeicher vergessen. */
export function vergissStand() {
  zwischenspeicher = null
}

/**
 * Notiz-Bausteine.
 *
 * Der Grund, warum es dieses Feld ueberhaupt gibt: waehrend des Gespraechs
 * ist keine Zeit zum Tippen. Ein Antippen setzt den Baustein, ein zweites
 * nimmt ihn wieder weg; der Rest bleibt Freitext. Die haeufigen Faelle sind
 * damit ein Fingertipp, der seltene Fall geht trotzdem.
 */
export const NOTIZ_BAUSTEINE = [
  'Nicht erreicht',
  'Mailbox',
  'Rückruf vereinbart',
  'Kein Interesse',
  'Falsche Nummer',
  'Zufrieden',
  'Technik prüfen',
  'Wiedervorlage',
] as const

/** Trennzeichen zwischen Bausteinen und Freitext – bewusst simpel. */
const TRENNER = ' · '

export function bausteinAktiv(notiz: string, baustein: string): boolean {
  return teileNotiz(notiz).includes(baustein)
}

function teileNotiz(notiz: string): string[] {
  return notiz
    .split(TRENNER)
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Baustein an- oder abwaehlen. Die Bausteine stehen vorn, in der Reihenfolge
 * von NOTIZ_BAUSTEINE, der getippte Rest bleibt hinten stehen.
 */
export function toggleBaustein(notiz: string, baustein: string): string {
  const teile = teileNotiz(notiz)
  const bekannt = new Set<string>(NOTIZ_BAUSTEINE)
  const gesetzt = new Set(teile.filter((t) => bekannt.has(t)))
  const frei = teile.filter((t) => !bekannt.has(t))

  if (gesetzt.has(baustein)) gesetzt.delete(baustein)
  else gesetzt.add(baustein)

  return [...NOTIZ_BAUSTEINE.filter((b) => gesetzt.has(b)), ...frei].join(TRENNER)
}
