import { describe, expect, it } from 'vitest'
import { alsText, zerlegeAntwort } from '@/lib/objection-text'
import { OBJECTION_CATALOG } from '@/lib/objection-catalog'

describe('Antwort in Einstieg und Punkte zerlegen', () => {
  it('nimmt die erste Zeile als Einstiegssatz und den Rest als Punkte', () => {
    const { einstieg, punkte } = zerlegeAntwort('Verstehe ich.\nErster Punkt.\nZweiter Punkt.')
    expect(einstieg).toBe('Verstehe ich.')
    expect(punkte).toEqual(['Erster Punkt.', 'Zweiter Punkt.'])
  })

  it('nimmt einen kurzen Einzeiler als Einstieg', () => {
    expect(zerlegeAntwort('Kein Problem, ich halte Sie nicht auf.')).toEqual({
      einstieg: 'Kein Problem, ich halte Sie nicht auf.',
      punkte: [],
    })
  })

  it('erfindet keine Struktur, wo jemand einen Absatz getippt hat', () => {
    const absatz = 'Ein sehr langer Absatz. '.repeat(12).trim()
    const { einstieg, punkte } = zerlegeAntwort(absatz)
    expect(einstieg).toBeNull()
    expect(punkte).toEqual([absatz])
  })

  it('haelt Leerzeilen und Einrueckungen aus', () => {
    expect(zerlegeAntwort('  Einstieg.  \n\n   Punkt.  \n\n')).toEqual({
      einstieg: 'Einstieg.',
      punkte: ['Punkt.'],
    })
  })

  it('kommt mit einer leeren Antwort klar', () => {
    expect(zerlegeAntwort('   \n  ')).toEqual({ einstieg: null, punkte: [] })
  })
})

describe('Der Startbestand ist zum Sprechen geschrieben', () => {
  it.each(OBJECTION_CATALOG.map((e) => [e.key, e] as const))(
    '%s hat einen Einstiegssatz und Punkte',
    (_key, eintrag) => {
      const { einstieg, punkte } = zerlegeAntwort(eintrag.answer)
      expect(einstieg).not.toBeNull()
      expect(punkte.length).toBeGreaterThan(0)
      // Was am Stueck vorgelesen wird, passt in eine Zeile auf dem Bildschirm.
      for (const zeile of [einstieg!, ...punkte]) expect(zeile.length).toBeLessThanOrEqual(180)
    },
  )
})

describe('Kopieren', () => {
  it('gibt Ueberschrift, Antwort und Rueckfrage weiter', () => {
    expect(alsText({ title: 'Zu teuer', answer: 'Verstehe ich.', followUp: 'Und sonst?' })).toBe(
      'Zu teuer\n\nVerstehe ich.\n\nUnd sonst?',
    )
  })

  it('laesst die Rueckfrage weg, wenn es keine gibt', () => {
    expect(alsText({ title: 'Zu teuer', answer: 'Verstehe ich.' })).toBe(
      'Zu teuer\n\nVerstehe ich.',
    )
  })
})
