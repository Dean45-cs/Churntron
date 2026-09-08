import { describe, expect, it } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  avatarUrl,
  erkenneBildTyp,
  liesAvatarDataUrl,
  neueAvatarVersion,
} from '@/lib/avatar'

/**
 * Das Profilbild ist die einzige Stelle, an der ein Nutzer beliebige Bytes in
 * die Datenbank schreibt – und unter deren Typ sie spaeter wieder ausgeliefert
 * werden. Genau das pruefen diese Tests.
 */

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff, 0xe0]
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0))
const WEBP_TAG = [...'WEBP'].map((c) => c.charCodeAt(0))

/** Kopf plus Fuellung, damit die Mindestlaenge von 64 Byte erreicht ist. */
function bild(kopf: number[], laenge = 200): Uint8Array {
  const bytes = new Uint8Array(laenge)
  bytes.set(kopf, 0)
  return bytes
}

function webp(laenge = 200): Uint8Array {
  const bytes = bild(WEBP, laenge)
  bytes.set(WEBP_TAG, 8)
  return bytes
}

function dataUrl(bytes: Uint8Array, typ = 'image/png') {
  return `data:${typ};base64,${Buffer.from(bytes).toString('base64')}`
}

describe('erkenneBildTyp', () => {
  it('erkennt die drei erlaubten Formate an den Magic Bytes', () => {
    expect(erkenneBildTyp(bild(PNG))).toBe('image/png')
    expect(erkenneBildTyp(bild(JPEG))).toBe('image/jpeg')
    expect(erkenneBildTyp(webp())).toBe('image/webp')
  })

  it('erkennt RIFF ohne WEBP-Kennung nicht als Bild', () => {
    expect(erkenneBildTyp(bild(WEBP))).toBeNull()
  })

  it('gibt bei allem anderen null zurueck', () => {
    expect(erkenneBildTyp(bild([0x3c, 0x3f, 0x78, 0x6d]))).toBeNull()
    expect(erkenneBildTyp(new Uint8Array(0))).toBeNull()
  })
})

describe('liesAvatarDataUrl', () => {
  it('nimmt ein gueltiges Bild an', () => {
    const ergebnis = liesAvatarDataUrl(dataUrl(bild(PNG)))
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) expect(ergebnis.bild.mimeType).toBe('image/png')
  })

  it('glaubt dem angegebenen Typ nicht, sondern den Bytes', () => {
    // Als PNG angekuendigt, tatsaechlich JPEG. Gespeichert – und spaeter
    // ausgeliefert – wird, was wirklich drinsteht.
    const ergebnis = liesAvatarDataUrl(dataUrl(bild(JPEG), 'image/png'))
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) expect(ergebnis.bild.mimeType).toBe('image/jpeg')
  })

  it('lehnt ein als PNG getarntes SVG ab', () => {
    const svg = new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script>${'x'.repeat(100)}</svg>`,
    )
    const ergebnis = liesAvatarDataUrl(dataUrl(svg))
    expect(ergebnis.ok).toBe(false)
  })

  it('lehnt ein SVG auch dann ab, wenn es sich als SVG ausgibt', () => {
    expect(liesAvatarDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=').ok).toBe(false)
  })

  it('lehnt zu grosse Bilder ab, ohne sie zu dekodieren', () => {
    const zuGross = dataUrl(bild(PNG, AVATAR_MAX_BYTES + 1024))
    const ergebnis = liesAvatarDataUrl(zuGross)
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.fehler).toMatch(/groß/)
  })

  it('lehnt zu kleine Datenmengen ab', () => {
    expect(liesAvatarDataUrl(dataUrl(bild(PNG, 16))).ok).toBe(false)
  })

  it.each([
    '',
    'https://example.invalid/bild.png',
    'data:text/html;base64,PGh0bWw+',
    'data:image/png;base64,nicht base64!',
  ])('lehnt "%s" ab', (roh) => {
    expect(liesAvatarDataUrl(roh).ok).toBe(false)
  })
})

describe('Adresse und Version', () => {
  it('haengt die Version an die Adresse – sonst bliebe das alte Bild im Cache', () => {
    expect(avatarUrl('abc123', 'v1')).toBe('/api/avatar/abc123?v=v1')
  })

  it('erzeugt bei jedem Aufruf eine andere Version', () => {
    expect(neueAvatarVersion()).not.toBe(neueAvatarVersion())
  })
})
