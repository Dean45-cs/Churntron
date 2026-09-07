import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Cent-Betraege als Euro formatiert – ueberall gleich. */
export function formatEuro(cents: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatDate(d: Date | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(d)
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
