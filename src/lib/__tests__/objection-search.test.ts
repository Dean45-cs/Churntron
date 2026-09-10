import { describe, expect, it } from 'vitest'
import {
  abstand,
  normalisieren,
  stamm,
  sucheEinwaende,
  type Durchsuchbar,
} from '@/lib/objection-search'
import { OBJECTION_CATALOG } from '@/lib/objection-catalog'
import { OBJECTION_CATEGORY_LABEL } from '@/lib/labels'
import type { ObjectionCategory } from '@prisma/client'

/**
 * Die Suche wird gegen den echten Startbestand geprueft und nicht gegen
 * Kunstdaten: Was zaehlt, ist die Frage „findet ein Vertriebler im Gespraech,
 * was er sucht" – und die beantwortet nur der Bestand, der wirklich drinsteht.
 *
 * Geprueft wird deshalb auch nicht die Punktzahl (die darf sich aendern),
 * sondern das Verhalten: welcher Eintrag oben steht und was ueberhaupt
 * gefunden wird.
 */

const BESTAND: (Durchsuchbar & { key: string })[] = OBJECTION_CATALOG.map((e) => ({
  key: e.key,
  title: e.title,
  variants: [...e.variants],
  tags: [...e.tags],
  answer: e.answer,
  followUp: e.followUp ?? null,
  kategorieLabel: OBJECTION_CATEGORY_LABEL[e.category as ObjectionCategory],
  helpful: 0,
}))

const keys = (begriff: string) => sucheEinwaende(BESTAND, begriff).map((t) => t.eintrag.key)
const bester = (begriff: string) => keys(begriff)[0]

describe('Normalisieren und Stammformen', () => {
  it('schreibt Umlaute aus – im Gespraech tippt niemand Umlaute', () => {
    expect(normalisieren('Kündigung während der Laufzeit')).toBe('kuendigung waehrend der laufzeit')
    expect(normalisieren('zu teuer!!!')).toBe('zu teuer')
  })

  it('fuehrt gebeugte Formen auf denselben Stamm', () => {
    expect(stamm('kuendigung')).toBe(stamm('kuendigen'))
    expect(stamm('anbieter')).toBe(stamm('anbietern'))
  })

  it('faengt ab, was der Stamm nicht schafft – ueber den Tippfehler-Abstand', () => {
    // Der Umlaut-Plural bleibt ein anderer Stamm; gefunden wird er trotzdem.
    expect(stamm('vertraege')).not.toBe(stamm('vertrag'))
    expect(keys('verträge')).toContain('laufzeit-zu-lang')
  })

  it('bricht den Abstand ab, sobald das Limit ueberschritten ist', () => {
    expect(abstand('preis', 'preis', 2)).toBe(0)
    expect(abstand('kuendigng', 'kuendigung', 2)).toBe(1)
    expect(abstand('preis', 'techniker', 2)).toBeGreaterThan(2)
  })
})

describe('Die Suche findet, was gemeint ist', () => {
  it('findet den Preis-Einwand zum Wortlaut "zu teuer"', () => {
    expect(bester('zu teuer')).toBe('zu-teuer')
  })

  it('findet ihn auch in einem ganzen Satz', () => {
    expect(bester('das ist mir alles viel zu teuer')).toBe('zu-teuer')
  })

  it('zeigt zum Stichwort "zu teuer" das ganze Preisthema', () => {
    const gefunden = keys('zu teuer')
    expect(gefunden).toContain('preiserhoehung')
    expect(gefunden).toContain('woanders-guenstiger')
    expect(gefunden).toContain('rabatt-gefordert')
  })

  it('verbindet Woerter desselben Themas ohne gemeinsame Buchstaben', () => {
    // "Budget" steht in keinem Eintrag – ueber das Wortfeld Preis findet es trotzdem.
    expect(keys('budget')).toContain('zu-teuer')
    expect(keys('rabatt')).toContain('rabatt-gefordert')
  })

  it('haelt Tippfehler aus', () => {
    expect(bester('kuendigng')).toBeDefined()
    expect(keys('techniger')).toContain('stoerung-nicht-behoben')
  })

  it('findet ueber die Variante statt ueber die Ueberschrift', () => {
    // Die Ueberschrift lautet "Ich habe gerade keine Zeit".
    expect(bester('ich bin gerade beim essen')).toBe('keine-zeit')
    expect(bester('mietwohnung')).toBe('mieter-nicht-zustaendig')
  })

  it('trennt Themen, die sich aehnlich anhoeren', () => {
    expect(bester('garten aufgraben')).toBe('garten-aufgraben')
    expect(bester('woher haben sie meine nummer')).toBe('woher-nummer')
    expect(bester('das muss ich mit meiner frau besprechen')).toBe('mit-partner-besprechen')
  })

  it('gewichtet den vollstaendigen Wortlaut ueber den halben', () => {
    const treffer = sucheEinwaende(BESTAND, 'wechsel ist mir zu viel aufwand')
    expect(treffer[0]?.eintrag.key).toBe('wechsel-zu-aufwendig')
    expect(treffer[0]!.relevanz).toBe(1)
    expect(treffer[1]!.relevanz).toBeLessThan(1)
  })

  it('zaehlt Treffer im Einwand selbst als Kerntreffer', () => {
    const kern = sucheEinwaende(BESTAND, 'zu teuer')
      .filter((t) => t.kern)
      .map((t) => t.eintrag.key)
    // Alles, was im Gespraech zum Thema Preis gehoert, gehoert in die Liste.
    expect(kern).toEqual(
      expect.arrayContaining([
        'zu-teuer',
        'preiserhoehung',
        'woanders-guenstiger',
        'rabatt-gefordert',
      ]),
    )
  })

  it('setzt ein Wort, das nur im Antworttext steht, vom Kerntreffer ab', () => {
    // "Spuelbohrung" kommt nur in der Einwandbehandlung zum Garten vor.
    const treffer = sucheEinwaende(BESTAND, 'spülbohrung')
    expect(treffer.map((t) => t.eintrag.key)).toEqual(['garten-aufgraben'])
    expect(treffer[0]!.kern).toBe(false)
  })

  it('nennt das Thema, ueber das ein Treffer zustande kam', () => {
    const [erster] = sucheEinwaende(BESTAND, 'zu teuer')
    expect(erster?.themen).toContain('Preis')
  })

  it('liefert nichts zurueck, wenn nichts gesucht wurde', () => {
    expect(sucheEinwaende(BESTAND, '')).toHaveLength(0)
    expect(sucheEinwaende(BESTAND, '   ')).toHaveLength(0)
  })

  it('erfindet keine Treffer', () => {
    expect(keys('quietschende fahrradkette')).toHaveLength(0)
  })

  it('stellt bei gleichem Treffer den bewaehrten Eintrag nach vorne', () => {
    const vorlage = BESTAND.find((e) => e.key === 'zu-teuer')!
    const gleichstand = [
      { ...vorlage, key: 'ohne-rueckmeldung', helpful: 0 },
      { ...vorlage, key: 'bewaehrt', helpful: 20 },
    ]
    expect(sucheEinwaende(gleichstand, 'zu teuer')[0]?.eintrag.key).toBe('bewaehrt')
  })
})
