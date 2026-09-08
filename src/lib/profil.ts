/**
 * Regeln rund um das eigene Konto: was in ein Profilfeld darf, wie lang ein
 * Passwort sein muss und in welchen Stufen die Oberflaeche sich selbst
 * aktualisiert.
 *
 * Reine Rechnung ohne Datenbank – damit die Server Actions duenn bleiben und
 * die Regeln pruefbar sind (src/lib/__tests__/profil.test.ts).
 */

export const NAME_MAX = 60
export const JOBTITLE_MAX = 60
export const ABOUT_MAX = 280
export const PASSWORT_MIN = 10

/** Standard, wenn zu einem Konto noch keine Einstellungen gespeichert sind. */
export const AKTUALISIERUNG_STANDARD = 30

/**
 * Auswahl fuer die stille Aktualisierung, in Sekunden. 0 schaltet sie ab.
 *
 * Kein freies Zahlenfeld: unter zehn Sekunden waere es fuer den Nutzen, den es
 * bringt, eine Menge Last – bei zwanzig Leuten in der Schicht sind 15 Sekunden
 * schon mehr als ein Aufruf pro Sekunde.
 */
export const AKTUALISIERUNG_STUFEN = [0, 15, 30, 60, 300] as const

export const AKTUALISIERUNG_LABEL: Record<number, string> = {
  0: 'aus – nur beim Seitenwechsel',
  15: 'alle 15 Sekunden',
  30: 'alle 30 Sekunden',
  60: 'jede Minute',
  300: 'alle 5 Minuten',
}

/**
 * Der Anzeigename. Er steht in der Topbar, im Leaderboard und an jeder
 * Aktivitaet – leer darf er deshalb nicht sein.
 */
export function saeubereName(roh: string): string | null {
  // Zeilenumbrueche und doppelte Leerzeichen wuerden das Layout zerreissen.
  const wert = roh.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
  return wert.length >= 2 ? wert : null
}

/** Freitextfelder duerfen leer bleiben – dann steht am Ende NULL in der Spalte. */
export function saeubereFreitext(roh: string, max: number): string | null {
  const wert = roh
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max)
  return wert.length > 0 ? wert : null
}

/**
 * E-Mail nur so weit pruefen, wie es hier etwas bringt: sie ist der
 * Anmeldename und muss eindeutig sein, mehr will diese Anwendung nicht wissen.
 */
export function saeubereEmail(roh: string): string | null {
  const wert = roh.trim().toLowerCase().slice(0, 120)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wert) ? wert : null
}

/**
 * Gibt die Fehlermeldung zurueck – oder null, wenn das Passwort taugt.
 *
 * Bewusst nur eine Laengenvorgabe und keine Zeichenklassen-Akrobatik: eine
 * lange Passphrase ist besser als "Sommer1!", und das BSI sieht das inzwischen
 * genauso.
 */
export function pruefePasswort(neu: string, wiederholung: string): string | null {
  if (neu.length < PASSWORT_MIN) {
    return `Das neue Passwort braucht mindestens ${PASSWORT_MIN} Zeichen.`
  }
  if (neu.length > 200) return 'Das neue Passwort ist zu lang.'
  if (neu !== wiederholung) return 'Die beiden Eingaben stimmen nicht überein.'
  return null
}

/** Nur Werte aus der Auswahl gelten – alles andere faellt auf den Standard. */
export function gueltigesIntervall(wert: number): number {
  return (AKTUALISIERUNG_STUFEN as readonly number[]).includes(wert)
    ? wert
    : AKTUALISIERUNG_STANDARD
}
