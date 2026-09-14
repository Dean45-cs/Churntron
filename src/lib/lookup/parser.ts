/**
 * Der Parser des Kampagnen-Lookups – 1:1 aus `kampagnen_lookup_v1.1.0.html`
 * uebernommen und nur mit Typen versehen.
 *
 * Am Verhalten wurde bewusst nichts geaendert. Diese Logik laeuft seit
 * Monaten gegen die echten PP-Listen; jede "Verbesserung" beim Portieren
 * waere eine Wette gegen Listen, die hier niemand vorliegen hat. Wenn etwas
 * anders werden soll, dann als eigene Aenderung mit einem Test, der die
 * betroffene Liste beschreibt.
 *
 * Reine Rechnung, keine Datenbank, kein DOM – deshalb in Node testbar.
 */

import type { BuildErgebnis, ExtraFeld, JiraLink, LookupRecord, Mapping, SpaltenTyp } from './types'

export function normHeader(s: unknown): string {
  return (s == null ? '' : String(s)).toLowerCase().replace(/[^a-z0-9äöüß]/g, '')
}

export function digits(s: unknown): string {
  return (s == null ? '' : String(s)).replace(/\D/g, '')
}

/* ----- Telefon -> innovaphone-Waehlformat ----- */

/**
 * Aus der Nummer in der Liste wird die Ziffernfolge, die in myApps eingefuegt
 * wird: kein Plus, keine Leerzeichen. Amtsholung ist die fuehrende 0,
 * international entsprechend 00 bzw. 000.
 */
export function normalizePhone(raw: unknown): string {
  const s = raw == null ? '' : String(raw).trim()
  if (!s) return ''
  const d = digits(s)
  if (d.length < 4) return ''
  if (s.startsWith('+') || d.startsWith('00')) {
    // international
    const cc = d.startsWith('00') ? d.slice(2) : d // Laender+Teilnehmer, kein Trunk
    return cc.startsWith('49') ? '00' + cc.slice(2) : '000' + cc
  }
  if (d.startsWith('0')) return '0' + d // national mit Trunk-0
  if (d.startsWith('49') && d.length >= 11) return '00' + d.slice(2)
  return '00' + d // ohne Trunk -> als national behandeln
}

/**
 * Eine Telefonzelle kann mehrere Nummern enthalten – in den echten Listen
 * steht regelmaessig "0431 12345 / 0170 9876543" oder zwei +49-Nummern nur
 * durch ein Leerzeichen getrennt.
 */
export function phonesFrom(raw: unknown): string[] {
  const s = raw == null ? '' : String(raw).trim()
  if (!s) return []
  // an expliziten Trennern splitten
  const parts = s.split(/\s*(?:\/|;|,|\||\n|\r|&|\boder\b|\bbzw\.?\b|\bsowie\b)\s*/i)
  // zusaetzlich an internen '+' trennen (zwei +49-Nummern nur mit Leerzeichen dazwischen)
  let more: string[] = []
  parts.forEach((p) => {
    p.split(/(?=\+)/).forEach((x) => {
      if (x.trim()) more.push(x)
    })
  })
  if (!more.length) more = [s]
  // Fallback: eine Zelle, aber Ergebnis unplausibel lang -> vermutlich zwei Nummern zusammengeklebt
  if (more.length === 1) {
    const d0 = normalizePhone(more[0])
    if (d0 && d0.replace(/\D/g, '').length > 14) {
      let alt = s.split(/\s{2,}/).filter((x) => digits(x).length >= 7)
      if (alt.length < 2) alt = s.split(/\s+/).filter((x) => digits(x).length >= 9)
      if (alt.length > 1) more = alt
    }
  }
  const out: string[] = []
  more.forEach((p) => {
    const d = normalizePhone(p)
    if (d && !out.includes(d)) out.push(d)
  })
  return out
}

/* ----- Jira -> {url,label} ----- */

export function jiraLink(raw: unknown): JiraLink | null {
  const s = raw == null ? '' : String(raw).trim()
  if (!s) return null
  const url = s.match(/https?:\/\/\S+/)
  const id = s.match(/[A-ZÄÖÜ]{2,}-\d+/)
  if (url) return { url: url[0], label: id ? id[0] : url[0] }
  if (id) return { url: 'https://jira.ennit.de/browse/' + id[0], label: id[0] }
  return null
}

/* ----- Inhaltstests je Typ ----- */

const CONTENT: Partial<Record<SpaltenTyp, (v: unknown) => boolean>> = {
  email: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(v).trim()),
  phone: (v) => {
    const s = String(v).trim()
    return /^[+()/\d .\-]{6,}$/.test(s) && digits(s).length >= 6
  },
  jira: (v) => /https?:\/\//.test(String(v)) || /[A-ZÄÖÜ]{2,}-\d+/.test(String(v)),
  kdn: (v) => /^\d{4,9}$/.test(String(v).trim()),
}

/* ----- Header-Synonyme (normalisiert) ----- */

const SYN: Record<SpaltenTyp, string[]> = {
  jira: [
    'jira',
    'jiraticket',
    'ticket',
    'ticketlink',
    'jiralink',
    'vorgang',
    'vorgangsnummer',
    'jiravorgang',
  ],
  email: ['email', 'mail', 'emailadresse', 'mailadresse', 'kontaktemail'],
  kdn: [
    'kundennummer',
    'kundennr',
    'kdnr',
    'kdn',
    'kundenid',
    'kundennrnr',
    'kundennrnrnr',
    'kndnr',
    'kundenkennung',
  ],
  phone: [
    'telefon',
    'telefonnummer',
    'rufnummer',
    'mobil',
    'mobilnummer',
    'mobilfunknummer',
    'handy',
    'handynummer',
    'tel',
    'telnr',
    'festnetz',
    'festnetznummer',
    'telefonnr',
    'kontaktnummer',
  ],
  kommentar: [
    'kommentar',
    'kommentare',
    'bemerkung',
    'bemerkungen',
    'notiz',
    'notizen',
    'hinweis',
    'anmerkung',
    'anmerkungen',
    'info',
    'infos',
  ],
  name: ['name', 'kundenname', 'kunde', 'ansprechpartner', 'vollername', 'fullname'],
  vorname: ['vorname', 'firstname'],
  nachname: ['nachname', 'familienname', 'lastname'],
  address: ['adresse', 'anschrift', 'anschlussadresse', 'wohnadresse', 'postadresse'],
  street: ['strasse', 'straße', 'str', 'hausanschrift'],
  plz: ['plz', 'postleitzahl'],
  ort: ['ort', 'stadt', 'wohnort'],
  vertrag: [
    'vertrag',
    'vertragsnummer',
    'vertragsnr',
    'vertragsid',
    'vertragskonto',
    'vertragskontonummer',
  ],
  produkt: ['produkt', 'tarif', 'paket', 'produktname'],
  gfall: ['geschäftsfall', 'geschaeftsfall', 'geschäftsvorfall', 'fall', 'kampagne', 'aktion'],
  ursache: ['ursache', 'ursachemeldung', 'ursachereal', 'grund', 'ergebnis'],
}

/** Reihenfolge der Zuweisung: eindeutige/wichtige Typen zuerst. */
const ORDER: SpaltenTyp[] = [
  'jira',
  'email',
  'kdn',
  'phone',
  'kommentar',
  'vorname',
  'nachname',
  'name',
  'address',
  'street',
  'plz',
  'ort',
  'vertrag',
  'produkt',
  'gfall',
  'ursache',
]

/**
 * STRICT: nur exakter Header-Treffer. Verhindert Fehl-Labels wie
 * "Vertragsstatus" -> Vertrag oder "Neuer Tarif" -> Produkt.
 */
const STRICT = new Set<SpaltenTyp>(['vertrag', 'produkt', 'gfall', 'ursache'])

/** Technische ID-Spalten: nicht anzeigen, aber als _uuid fuer Merkposten behalten. */
const IGNORE_EXTRA = new Set(['uuid', 'guid'])

/** Findet die Kopfzeile in den ersten 15 Zeilen – die Listen haben oft Vorspann. */
export function detectHeaderRow(aoa: unknown[][]): number {
  const limit = Math.min(aoa.length, 15)
  let best = 0
  let bestScore = -1
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || []
    if (i + 1 >= aoa.length) break
    let nonEmpty = 0
    let strings = 0
    let headerHits = 0
    row.forEach((c) => {
      const t = (c == null ? '' : String(c)).trim()
      if (t) {
        nonEmpty++
        if (!/^[\d.,\s€%+-]+$/.test(t)) strings++
      }
      const nh = normHeader(t)
      if (nh) {
        for (const k in SYN) {
          if (SYN[k as SpaltenTyp].some((s) => nh === s || (s.length >= 4 && nh.includes(s)))) {
            headerHits++
            break
          }
        }
      }
    })
    // Bonus, wenn die Zeile ueberhaupt nach Ueberschriften aussieht
    const score = headerHits * 5 + strings + nonEmpty * 0.5
    if (nonEmpty >= 2 && score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/**
 * Ordnet Spalten zu: ueber den Synonym-Katalog und zusaetzlich ueber den
 * Inhalt der ersten 80 Datenzeilen. Der Inhaltstest faengt Listen ab, deren
 * Ueberschriften anders heissen als erwartet.
 */
export function detectColumns(headers: unknown[], rows: unknown[][]): Mapping {
  const nCols = headers.length
  const used = new Array<boolean>(nCols).fill(false)
  const map = {} as Mapping
  const sample = rows.slice(0, 80)
  const colVals = (c: number) =>
    sample.map((r) => r[c]).filter((v) => v != null && String(v).trim() !== '')

  function contentFrac(c: number, testKey: SpaltenTyp) {
    const vals = colVals(c)
    if (!vals.length) return 0
    const t = CONTENT[testKey]
    if (!t) return 0
    let hit = 0
    vals.forEach((v) => {
      if (t(v)) hit++
    })
    return hit / vals.length
  }

  ORDER.forEach((type) => {
    let bestCol = -1
    let bestScore = 0
    for (let c = 0; c < nCols; c++) {
      if (used[c]) continue
      const nh = normHeader(headers[c])
      let hScore = 0
      if (nh) {
        if (SYN[type].some((s) => nh === s)) hScore = 3
        else if (SYN[type].some((s) => s.length >= 4 && (nh.includes(s) || s.includes(nh))))
          hScore = 2
      }
      let cScore = 0
      if (CONTENT[type]) {
        const f = contentFrac(c, type)
        if (f >= 0.6) cScore = type === 'kdn' ? 1 : 2 // kdn schwaecher, kollidiert mit phone
      }
      const total = hScore * 10 + cScore
      // STRICT-Typen: nur exakter Header-Treffer; sonst Header ODER klarer Inhalt
      const ok = STRICT.has(type)
        ? hScore === 3
        : hScore > 0 || (!!CONTENT[type] && contentFrac(c, type) >= 0.7)
      if (ok && total > bestScore) {
        bestScore = total
        bestCol = c
      }
    }
    if (bestCol >= 0) {
      map[type] = bestCol
      used[bestCol] = true
    }
  })

  // uebrige, benannte Spalten = "extra" (durchreichen); UUID/GUID separat merken
  const extras: { col: number; header: string }[] = []
  let uuidCol = -1
  for (let c = 0; c < nCols; c++) {
    if (used[c]) continue
    const h = (headers[c] == null ? '' : String(headers[c])).trim()
    if (!h) continue
    if (IGNORE_EXTRA.has(normHeader(h))) {
      if (uuidCol < 0) uuidCol = c
      continue
    }
    extras.push({ col: c, header: h })
  }
  map._extras = extras
  map._uuidCol = uuidCol
  return map
}

function cell(row: unknown[], i: number | undefined): string {
  return i == null || i < 0 ? '' : row[i] == null ? '' : String(row[i]).trim()
}

/** Baut aus dem Array-of-Arrays einer Tabelle die Datensaetze der Kartenliste. */
export function buildRecords(aoaIn: unknown[][] | null | undefined): BuildErgebnis {
  const aoa = (aoaIn || []).map((r) => (Array.isArray(r) ? r : []))
  if (!aoa.length) {
    return { records: [], headers: [], mapping: { _extras: [], _uuidCol: -1 }, headerRow: 0 }
  }
  const hr = detectHeaderRow(aoa)
  const headers = (aoa[hr] || []).map((h) => (h == null ? '' : String(h)))
  const dataRows = aoa
    .slice(hr + 1)
    .filter((r) => r.some((c) => c != null && String(c).trim() !== ''))
  const map = detectColumns(headers, dataRows)

  const records: LookupRecord[] = []
  for (let ri = hr + 1; ri < aoa.length; ri++) {
    const row = aoa[ri]
    if (!row || !row.some((c) => c != null && String(c).trim() !== '')) continue
    let name = cell(row, map.name)
    if (!name && (map.vorname != null || map.nachname != null))
      name = [cell(row, map.vorname), cell(row, map.nachname)].filter(Boolean).join(' ')
    let address = cell(row, map.address)
    if (!address && (map.street != null || map.plz != null || map.ort != null))
      address = [
        cell(row, map.street),
        [cell(row, map.plz), cell(row, map.ort)].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(', ')

    const phoneRaw = cell(row, map.phone)
    const dials = phonesFrom(phoneRaw)
    const extras: ExtraFeld[] = (map._extras || [])
      .map((e) => ({ header: e.header, value: cell(row, e.col) }))
      .filter((e) => e.value)

    records.push({
      dials,
      dial: dials[0] || '',
      telRaw: phoneRaw,
      name,
      address,
      kdn: cell(row, map.kdn),
      email: cell(row, map.email),
      kommentar: cell(row, map.kommentar),
      vertrag: cell(row, map.vertrag),
      produkt: cell(row, map.produkt),
      gfall: cell(row, map.gfall),
      ursache: cell(row, map.ursache),
      jira: jiraLink(cell(row, map.jira)),
      _uuid: cell(row, map._uuidCol),
      _aoaIdx: ri,
      extras,
    })
  }

  return { records, headers, mapping: map, headerRow: hr }
}

/**
 * Schluessel, unter dem Status, Formular und Notiz zu einem Datensatz liegen.
 * Bewusst in dieser Reihenfolge: die technische UUID ist stabil, danach die
 * Vertrags- und die Kundennummer. Erst wenn nichts davon da ist, muss Name
 * plus Nummer herhalten.
 */
export function recKey(r: LookupRecord): string {
  return r._uuid || r.vertrag || r.kdn || (r.name || '') + '|' + (r.dial || '')
}
