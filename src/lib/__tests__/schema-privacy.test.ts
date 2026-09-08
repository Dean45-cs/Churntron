import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Haelt die zentrale Zusage des Projekts fest: In der Datenbank stehen keine
 * Klardaten von Kundinnen und Kunden. Der Test liest das Prisma-Schema und
 * prueft das Contract-Modell auf verbotene Felder.
 *
 * Wenn dieser Test rot wird, ist das kein Formfehler – dann wurde die
 * Datenschutz-Zusage aus PLAN.md gebrochen.
 */

const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')

function modelBody(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`Model ${name} nicht im Schema gefunden`)
  return match[1]!
}

/** Feldnamen eines Modells, ohne Kommentarzeilen und Block-Attribute. */
function fieldNames(body: string) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.startsWith('//') && !line.startsWith('///') && !line.startsWith('@@'),
    )
    .map((line) => line.split(/\s+/)[0]!)
}

describe('Datenschutz: Contract enthaelt keine Klardaten', () => {
  const verboten = [
    'name',
    'firstName',
    'lastName',
    'vorname',
    'nachname',
    'address',
    'adresse',
    'street',
    'strasse',
    'plz',
    'city',
    'ort',
    'phone',
    'telefon',
    'mobil',
    'email',
    'mail',
  ]

  const felder = fieldNames(modelBody('Contract')).map((f) => f.toLowerCase())

  it.each(verboten)('hat kein Feld "%s"', (feld) => {
    expect(felder).not.toContain(feld.toLowerCase())
  })

  it('verknuepft Kunden ueber externalRef', () => {
    expect(felder).toContain('externalref')
  })

  it('haelt die Regel als Kommentar im Schema fest', () => {
    expect(schema).toMatch(/KEINE Klardaten/i)
  })
})

/**
 * Die zweite Zusage, seit es Profile gibt: von den eigenen Leuten steht auch
 * nur das Noetige drin.
 *
 * Beschaeftigtendaten sind erlaubt – ohne E-Mail keine Anmeldung, ohne Namen
 * kein Leaderboard. Aber Privatanschrift, Rufnummer oder Geburtsdatum haben in
 * einem Vertriebswerkzeug nichts zu suchen, und ein Anwesenheitsprotokoll erst
 * recht nicht: Provisionen und Leaderboard sind schon jetzt
 * mitbestimmungspflichtige Leistungsdaten (siehe DEPLOY.md).
 */
describe('Datenschutz: User traegt nur, was gebraucht wird', () => {
  const verboten = [
    'address',
    'adresse',
    'street',
    'strasse',
    'plz',
    'city',
    'ort',
    'phone',
    'telefon',
    'mobil',
    'birthday',
    'geburtsdatum',
    'geburtstag',
    'iban',
    'personalnummer',
    // Ein Verlauf statt eines einzelnen Zeitpunkts waere eine Anwesenheitsliste.
    'loginHistory',
    'sessions',
    'lastSeenAt',
  ]

  const felder = fieldNames(modelBody('User')).map((f) => f.toLowerCase())

  it.each(verboten)('hat kein Feld "%s"', (feld) => {
    expect(felder).not.toContain(feld.toLowerCase())
  })

  it('haelt das Profilbild in einer eigenen Tabelle', () => {
    expect(fieldNames(modelBody('UserAvatar'))).toContain('data')
    // Nicht an User: sonst laegen die Bytes bei jeder Nutzerabfrage mit auf dem Tisch.
    expect(felder).not.toContain('avatardata')
  })
})

describe('Datenmodell traegt die geplanten Bausteine', () => {
  it.each([
    'Team',
    'User',
    'UserAvatar',
    'Contract',
    'ChurnActivity',
    'CommissionRule',
    'Commission',
    'Challenge',
    'PointsEvent',
    'ImportBatch',
  ])('kennt das Modell %s', (name) => {
    expect(() => modelBody(name)).not.toThrow()
  })

  it('speichert Punkte als Einzelereignisse, damit Zeitraumfilter moeglich sind', () => {
    const body = modelBody('PointsEvent')
    expect(fieldNames(body)).toContain('occurredAt')
  })
})
