import { describe, expect, it } from 'vitest'
import {
  ABOUT_MAX,
  AKTUALISIERUNG_STANDARD,
  NAME_MAX,
  PASSWORT_MIN,
  gueltigesIntervall,
  pruefePasswort,
  saeubereEmail,
  saeubereFreitext,
  saeubereName,
} from '@/lib/profil'

describe('saeubereName', () => {
  it('raeumt Leerraum weg', () => {
    expect(saeubereName('  Kevin   Krause \n')).toBe('Kevin Krause')
  })

  it('lehnt zu kurze Namen ab – der Name traegt Topbar und Leaderboard', () => {
    expect(saeubereName('K')).toBeNull()
    expect(saeubereName('   ')).toBeNull()
  })

  it('kuerzt statt abzulehnen', () => {
    expect(saeubereName('a'.repeat(200))).toHaveLength(NAME_MAX)
  })
})

describe('saeubereFreitext', () => {
  it('macht aus leer null, damit in der Spalte NULL steht und kein ""', () => {
    expect(saeubereFreitext('   ', ABOUT_MAX)).toBeNull()
  })

  it('behaelt Zeilenumbrueche, faltet aber Leerzeichen', () => {
    expect(saeubereFreitext('Erste  Zeile\nZweite', ABOUT_MAX)).toBe('Erste Zeile\nZweite')
  })

  it('kuerzt auf die uebergebene Laenge', () => {
    expect(saeubereFreitext('x'.repeat(500), ABOUT_MAX)).toHaveLength(ABOUT_MAX)
  })
})

describe('saeubereEmail', () => {
  it('normalisiert auf Kleinschreibung – die Adresse ist der Anmeldename', () => {
    expect(saeubereEmail('  Kevin@TNG.de ')).toBe('kevin@tng.de')
  })

  it.each(['ohne-at.de', 'zwei@@tng.de', 'kein@tld', '', 'mit leer@tng.de'])(
    'lehnt "%s" ab',
    (roh) => {
      expect(saeubereEmail(roh)).toBeNull()
    },
  )
})

describe('pruefePasswort', () => {
  it('verlangt die Mindestlaenge', () => {
    const kurz = 'a'.repeat(PASSWORT_MIN - 1)
    expect(pruefePasswort(kurz, kurz)).toMatch(new RegExp(String(PASSWORT_MIN)))
  })

  it('meldet abweichende Wiederholung', () => {
    expect(pruefePasswort('richtig lang genug', 'etwas anderes')).toMatch(/überein/)
  })

  it('gibt null zurueck, wenn alles passt', () => {
    expect(pruefePasswort('ein langes passwort', 'ein langes passwort')).toBeNull()
  })

  it('nimmt lange Passphrasen ohne Sonderzeichen an', () => {
    const passphrase = 'pferd batterie heftklammer richtig'
    expect(pruefePasswort(passphrase, passphrase)).toBeNull()
  })
})

describe('gueltigesIntervall', () => {
  it('nimmt nur Werte aus der Auswahl', () => {
    expect(gueltigesIntervall(0)).toBe(0)
    expect(gueltigesIntervall(60)).toBe(60)
  })

  it('faellt bei allem anderen auf den Standard zurueck', () => {
    expect(gueltigesIntervall(1)).toBe(AKTUALISIERUNG_STANDARD)
    expect(gueltigesIntervall(NaN)).toBe(AKTUALISIERUNG_STANDARD)
    expect(gueltigesIntervall(-30)).toBe(AKTUALISIERUNG_STANDARD)
  })
})
