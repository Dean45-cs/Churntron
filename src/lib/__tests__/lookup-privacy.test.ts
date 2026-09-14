import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Das Kampagnen-Lookup ist die einzige Stelle in Churntron, die Klardaten von
 * Kundinnen und Kunden sieht: Name, Anschrift, Telefonnummer, E-Mail. Es darf
 * sie sehen, weil die Liste den Browser nicht verlaesst.
 *
 * Genau das prueft dieser Test. Er ist das Gegenstueck zu
 * schema-privacy.test.ts: dort steht, dass die Datenbank keine Klardaten
 * kennt – hier steht, dass es keinen Weg dorthin gibt.
 *
 * Wenn dieser Test rot wird, ist das kein Formfehler. Dann ist aus einem
 * lokalen Werkzeug eine Datenuebertragung geworden.
 */

const WURZEL = process.cwd()

const ORDNER = ['src/lib/lookup', 'src/app/(dashboard)/dashboard/lookup']

function dateien(ordner: string): string[] {
  const abs = join(WURZEL, ordner)
  return readdirSync(abs, { recursive: true, encoding: 'utf8' })
    .filter((p) => /\.tsx?$/.test(p))
    .map((p) => join(abs, p))
}

const alle = ORDNER.flatMap(dateien)

const quellen = alle.map((pfad) => ({
  pfad: pfad.slice(WURZEL.length + 1),
  // Kommentare raus: sie reden ueber genau diese Begriffe.
  code: readFileSync(pfad, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, ''),
}))

describe('Das Lookup hat die Dateien, um die es geht', () => {
  it('findet beide Ordner', () => {
    expect(alle.length).toBeGreaterThan(5)
  })

  it('enthaelt die Client-Komponente', () => {
    expect(quellen.map((q) => q.pfad)).toContain(
      join('src/app/(dashboard)/dashboard/lookup', 'lookup-client.tsx'),
    )
  })
})

describe('Kein Weg vom Lookup zum Server', () => {
  /**
   * Jeder Eintrag ist ein Weg, auf dem ein Datensatz den Rechner verlassen
   * koennte. Wer hier etwas streichen will, sollte sehr genau wissen, warum.
   */
  const verboten: [RegExp, string][] = [
    [/\bfetch\s*\(/, 'fetch – die Liste bliebe nicht lokal'],
    [/XMLHttpRequest/, 'XMLHttpRequest'],
    [/navigator\.sendBeacon/, 'sendBeacon'],
    [/\bnew\s+WebSocket\b/, 'WebSocket'],
    [/\bnew\s+EventSource\b/, 'EventSource'],
    [/['"]use server['"]/, "'use server' – das waere eine Server Action"],
    [/from\s+['"]@\/lib\/db['"]/, 'Prisma-Client'],
    [/\bprisma\b/i, 'Prisma'],
    [/from\s+['"]@\/lib\/queries/, 'Datenbankabfragen'],
    [/\bnext\/server\b/, 'next/server'],
    [/\baxios\b/, 'axios'],
  ]

  for (const { pfad, code } of quellen) {
    describe(pfad, () => {
      it.each(verboten)('enthaelt kein %s (%s)', (muster) => {
        expect(code).not.toMatch(muster)
      })
    })
  }
})

describe('Der Schichtstand liegt im Browser, nicht auf dem Server', () => {
  const storage = readFileSync(join(WURZEL, 'src/lib/lookup/storage.ts'), 'utf8')

  it('benutzt localStorage', () => {
    expect(storage).toMatch(/localStorage/)
  })

  it('faengt ab, dass localStorage gesperrt sein kann', () => {
    // Privater Modus, volles Kontingent, kaputter Eintrag: das darf die
    // Schicht nicht abbrechen.
    expect(storage).toMatch(/catch/)
  })

  it('prueft auf fehlendes window, damit das Rendern auf dem Server nicht bricht', () => {
    expect(storage).toMatch(/typeof window === 'undefined'/)
  })
})

describe('Die Seite sagt den Vertrieblern, wo die Liste bleibt', () => {
  const seite = readFileSync(join(WURZEL, 'src/app/(dashboard)/dashboard/lookup/page.tsx'), 'utf8')

  it('weist im Text darauf hin, dass nichts hochgeladen wird', () => {
    expect(seite).toMatch(/nicht hochgeladen/i)
  })

  it('nennt die Datenbank ausdruecklich', () => {
    expect(seite).toMatch(/Datenbank/i)
  })
})
