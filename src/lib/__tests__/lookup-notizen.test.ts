import { describe, expect, it } from 'vitest'
import { NOTIZ_BAUSTEINE, bausteinAktiv, toggleBaustein } from '@/lib/lookup/storage'
import { passt, suchText } from '@/lib/lookup/suche'
import type { LookupRecord } from '@/lib/lookup/types'

/**
 * Die internen Notizen sind das, was in Churntron neu ist. Sie sollen im
 * Gespraech mit einem Fingertipp gehen – deshalb die Bausteine – und sich
 * hinterher wiederfinden lassen, deshalb stecken sie in der Suche.
 */

describe('Notiz-Bausteine: antippen statt tippen', () => {
  it('setzt einen Baustein', () => {
    expect(toggleBaustein('', 'Nicht erreicht')).toBe('Nicht erreicht')
  })

  it('nimmt ihn beim zweiten Antippen wieder weg', () => {
    const einmal = toggleBaustein('', 'Nicht erreicht')
    expect(toggleBaustein(einmal, 'Nicht erreicht')).toBe('')
  })

  it('haelt mehrere Bausteine in der Reihenfolge der Leiste', () => {
    let n = ''
    n = toggleBaustein(n, 'Wiedervorlage')
    n = toggleBaustein(n, 'Mailbox')
    // Mailbox steht in NOTIZ_BAUSTEINE vor Wiedervorlage.
    expect(n).toBe('Mailbox · Wiedervorlage')
  })

  it('laesst den getippten Freitext stehen', () => {
    const n = toggleBaustein('will erst mit dem Partner sprechen', 'Rückruf vereinbart')
    expect(n).toBe('Rückruf vereinbart · will erst mit dem Partner sprechen')
  })

  it('behaelt den Freitext auch beim Abwaehlen', () => {
    const mit = toggleBaustein('ruft selbst zurück', 'Mailbox')
    expect(toggleBaustein(mit, 'Mailbox')).toBe('ruft selbst zurück')
  })

  it('erkennt gesetzte Bausteine', () => {
    const n = toggleBaustein('Notiz dazu', 'Zufrieden')
    expect(bausteinAktiv(n, 'Zufrieden')).toBe(true)
    expect(bausteinAktiv(n, 'Mailbox')).toBe(false)
  })

  it('verwechselt Freitext nicht mit einem Baustein', () => {
    expect(bausteinAktiv('Mailbox war voll', 'Mailbox')).toBe(false)
  })

  it('bietet die haeufigen Gespraechsausgaenge an', () => {
    expect(NOTIZ_BAUSTEINE).toContain('Nicht erreicht')
    expect(NOTIZ_BAUSTEINE).toContain('Rückruf vereinbart')
    expect(NOTIZ_BAUSTEINE.length).toBeLessThanOrEqual(8)
  })
})

describe('Suche: ein Feld fuer alles', () => {
  const record: LookupRecord = {
    dials: ['0015123456789'],
    dial: '0015123456789',
    telRaw: '+49 1512 3456789',
    name: 'Max Muster',
    address: 'Hauptstr. 1, 24103 Kiel',
    kdn: '123456',
    email: 'max@example.de',
    kommentar: 'Bitte vormittags',
    vertrag: 'V-9001',
    produkt: 'Fiber 250',
    gfall: 'Welcome Call',
    ursache: '',
    jira: { url: 'https://jira.ennit.de/browse/ABC-1', label: 'ABC-1' },
    _uuid: 'u1',
    _aoaIdx: 2,
    extras: [{ header: 'Zugehörige Verträge', value: '2T9X' }],
  }

  const hay = suchText(record)

  it.each([
    ['die Kundennummer', '123456'],
    ['den Namen', 'max muster'],
    ['die Waehlnummer', '0015123456789'],
    ['die Originalnummer', '+49 1512'],
    ['die Vertragsnummer', 'v-9001'],
    ['den Jira-Vorgang', 'abc-1'],
    ['den Kommentar aus der Liste', 'vormittags'],
  ])('findet ueber %s', (_was, suche) => {
    expect(passt(hay, suche)).toBe(true)
  })

  it('findet auch ueber eine durchgereichte Spalte', () => {
    // "Zugehörige Verträge" ist keine bekannte Spaltenart, steht aber in der
    // Liste – und danach fragt der Kunde am Telefon.
    expect(passt(hay, '2T9X')).toBe(true)
  })

  it('findet ueber die eigene Notiz', () => {
    const mitNotiz = suchText(record, 'Rückruf vereinbart')
    expect(passt(mitNotiz, 'rückruf')).toBe(true)
    expect(passt(hay, 'rückruf')).toBe(false)
  })

  it('zeigt bei leerer Suche alles', () => {
    expect(passt(hay, '')).toBe(true)
    expect(passt(hay, '   ')).toBe(true)
  })

  it('findet nichts, was nicht da ist', () => {
    expect(passt(hay, 'Erika')).toBe(false)
  })
})
