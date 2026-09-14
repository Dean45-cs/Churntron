import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EURO = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const EURO_RUND = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/**
 * Cent-Betraege als Euro – ueberall gleich, und immer mit zwei Nachkommastellen.
 * Das ist keine Kosmetik: der Katalog kennt Saetze wie 6,50 EUR und 1,00 EUR.
 * Gerundet auf ganze Euro waere ein Welcome Call "1 EUR" und die Summe von 137
 * Vorgaengen um mehrere Euro daneben – genau die Zahl, die beim Abgleich mit der
 * Abrechnung stimmen muss.
 */
export function formatEuro(cents: number) {
  return EURO.format(cents / 100)
}

/** Nur fuer grosse Kennzahlen, wo die Nachkommastellen nichts beitragen. */
export function formatEuroRund(cents: number) {
  return EURO_RUND.format(cents / 100)
}

export function formatProzent(anteil: number, stellen = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  }).format(anteil)
}

export function formatZahl(wert: number, stellen = 0) {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  }).format(wert)
}

/** Euro-Betrag als Eingabewert: "12,50" statt "12,5" und ohne Waehrungszeichen. */
export function centsAlsEingabe(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/**
 * Euro-Eingabe zu Cent. Nimmt Komma und Punkt, ignoriert Waehrungszeichen und
 * Tausenderpunkte – getippt wird in der Praxis alles.
 */
export function eingabeAlsCents(eingabe: string): number | null {
  const bereinigt = eingabe
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  if (!bereinigt || bereinigt === '-') return null
  const wert = Number(bereinigt)
  if (!Number.isFinite(wert)) return null
  return Math.round(wert * 100)
}

const DATUM = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  // Ohne Zeitzone rechnet der Server in UTC – der 20.10. um 00:00 deutscher
  // Zeit wuerde dann als 19.10. erscheinen. Genau ein Tag daneben, und beim
  // Stichtag der Abrechnung faellt das auf.
  timeZone: 'Europe/Berlin',
})

export function formatDate(d: Date | null | undefined) {
  if (!d) return '—'
  return DATUM.format(d)
}

/**
 * Initialen fuer die Avatar-Kreise. Nur Buchstaben zaehlen – sonst wird aus
 * "Kevin (Azubi)" ein "K(".
 */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, '')[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
