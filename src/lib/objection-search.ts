/**
 * Die Suche der Einwand-Wiki.
 *
 * Die Ausgangslage ist ein Telefonat: der Kunde sagt „das ist mir zu teuer",
 * und die passende Einwandbehandlung soll da sein, bevor die Pause peinlich
 * wird. Getippt wird dabei, was gerade gesagt wurde – nicht die Ueberschrift,
 * unter der der Eintrag in der Wiki steht. Ein reiner Textvergleich findet
 * deshalb zu wenig: „Preiserhoehung" und „zu teuer" haben keinen Buchstaben
 * gemeinsam und meinen dasselbe.
 *
 * Vier Schichten, in dieser Reihenfolge:
 *
 * 1. **Normalisieren** – Kleinschreibung, Umlaute ausgeschrieben (ae, oe, ue,
 *    ss). Wer im Gespraech tippt, tippt keine Umlaute.
 * 2. **Stammformen** – „kuendigen", „Kuendigung" und „gekuendigt" landen auf
 *    demselben Stamm. Bewusst grob: ein echter Stemmer waere hier zu viel.
 * 3. **Themen** – ein Katalog von Wortfeldern (unten). „teuer", „Kosten",
 *    „Budget" und „Rabatt" gehoeren zum Thema Preis; wer eines tippt, findet
 *    die Eintraege zu allen anderen mit.
 * 4. **Tippfehler** – Levenshtein-Abstand 1 bis 2, je nach Wortlaenge.
 *    „Kündigng" soll noch treffen.
 *
 * Das Ganze ist eine reine Rechnung ohne Datenbank: die Wiki umfasst ein paar
 * Dutzend bis ein paar hundert Eintraege, die passen in den Arbeitsspeicher und
 * werden bei jedem Tastendruck neu bewertet – im Browser, ohne Netzrunde.
 * Sollte die Wiki einmal in die Tausende gehen, wandert genau diese Funktion in
 * eine Server Action oder in die Volltextsuche von Postgres; die Bewertung
 * bleibt dieselbe, nur der Ort aendert sich.
 */

// --- Wortfelder ------------------------------------------------------------

/**
 * Die Themen der Suche. Jede Zeile ist ein Wortfeld: taucht eines der Woerter
 * in der Anfrage auf, gelten alle anderen als verwandt.
 *
 * Das ist die Stelle, an der die Suche schlauer wird. Wenn im Team ein Wort
 * fehlt, das im Gespraech oft faellt, gehoert es hierher – eine Zeile, kein
 * Code.
 */
export const THEMEN: { id: string; label: string; woerter: string[] }[] = [
  {
    id: 'preis',
    label: 'Preis',
    woerter: [
      'teuer',
      'teurer',
      'teuerste',
      'preis',
      'preise',
      'preiserhoehung',
      'erhoehung',
      'kosten',
      'kostet',
      'kostenlos',
      'guenstig',
      'guenstiger',
      'billig',
      'billiger',
      'budget',
      'geld',
      'sparen',
      'rabatt',
      'nachlass',
      'gutschrift',
      'monatlich',
      'euro',
      'gebuehr',
      'rechnung',
      'zahlen',
      'bezahlen',
      'aufschlag',
      'leisten',
    ],
  },
  {
    id: 'wettbewerb',
    label: 'Wettbewerb',
    woerter: [
      'wettbewerber',
      'wettbewerb',
      'konkurrenz',
      'mitbewerber',
      'anbieter',
      'telekom',
      'vodafone',
      'kabel',
      'wechsel',
      'wechseln',
      'angebot',
      'vergleich',
      'woanders',
      'anderen',
      'besser',
    ],
  },
  {
    id: 'technik',
    label: 'Technik',
    woerter: [
      'technik',
      'stoerung',
      'stoerungen',
      'ausfall',
      'leitung',
      'internet',
      'langsam',
      'bandbreite',
      'geschwindigkeit',
      'wlan',
      'router',
      'verbindung',
      'mbit',
      'gbit',
      'glasfaser',
      'kupfer',
      'dsl',
      'netz',
      'stabil',
      'instabil',
    ],
  },
  {
    id: 'bau',
    label: 'Bau',
    woerter: [
      'bau',
      'baustelle',
      'tiefbau',
      'graben',
      'garten',
      'hausanschluss',
      'verlegen',
      'dreck',
      'schmutz',
      'bohren',
      'wand',
      'einfahrt',
      'grundstueck',
      'eigentuemer',
      'aufwand',
    ],
  },
  {
    id: 'service',
    label: 'Service',
    woerter: [
      'service',
      'hotline',
      'warteschleife',
      'techniker',
      'beratung',
      'unfreundlich',
      'erreichbar',
      'aerger',
      'erfahrung',
      'erfahrungen',
      'unzufrieden',
      'beschwerde',
      'kundendienst',
      'support',
      'versprochen',
      'gewartet',
    ],
  },
  {
    id: 'zeit',
    label: 'Zeit',
    woerter: [
      'zeit',
      'spaeter',
      'gerade',
      'ungeguenstig',
      'ungelegen',
      'rueckruf',
      'zurueckrufen',
      'melden',
      'eilig',
      'unterwegs',
      'arbeit',
      'feierabend',
      'termin',
      'stress',
      'essen',
    ],
  },
  {
    id: 'bedarf',
    label: 'Bedarf',
    woerter: [
      'brauche',
      'brauchen',
      'bedarf',
      'interesse',
      'interessiert',
      'reicht',
      'ausreichend',
      'genug',
      'nutze',
      'benutze',
      'selten',
      'wenig',
      'rentiert',
      'lohnt',
      'noetig',
      'zufrieden',
    ],
  },
  {
    id: 'entscheidung',
    label: 'Entscheidung',
    woerter: [
      'partner',
      'partnerin',
      'frau',
      'mann',
      'familie',
      'sohn',
      'tochter',
      'vermieter',
      'hausverwaltung',
      'eigentuemer',
      'chef',
      'absprechen',
      'besprechen',
      'ruecksprache',
      'entscheiden',
      'entscheidung',
      'allein',
      'gemeinsam',
      'ueberlegen',
      'bedenkzeit',
    ],
  },
  {
    id: 'vertrag',
    label: 'Vertrag',
    woerter: [
      'vertrag',
      'laufzeit',
      'kuendigung',
      'kuendigen',
      'gekuendigt',
      'frist',
      'verlaengerung',
      'bindung',
      'binden',
      'monate',
      'jahre',
      'widerruf',
      'sonderkuendigung',
      'aufhebung',
      'tarif',
      'wechselt',
    ],
  },
  {
    id: 'vertrauen',
    label: 'Vertrauen',
    woerter: [
      'serioes',
      'betrug',
      'masche',
      'datenschutz',
      'daten',
      'nummer',
      'woher',
      'unerwuenscht',
      'werbung',
      'drueckerkolonne',
      'misstrauen',
      'skeptisch',
      'unterlagen',
      'schriftlich',
      'post',
      'mail',
      'email',
      'schicken',
      'zusenden',
      'beweis',
    ],
  },
  {
    id: 'umzug',
    label: 'Umzug',
    woerter: [
      'umzug',
      'umziehen',
      'ausziehen',
      'wohnung',
      'haus',
      'adresse',
      'mitnehmen',
      'auszug',
      'einzug',
      'miete',
      'mietwohnung',
    ],
  },
  {
    id: 'zusatz',
    label: 'Zusatzprodukte',
    woerter: [
      'tv',
      'fernsehen',
      'waipu',
      'streaming',
      'netflix',
      'sender',
      'telefon',
      'festnetz',
      'mobilfunk',
      'handy',
      'lte',
      'sim',
      'paket',
    ],
  },
]

/**
 * Fuellwoerter. Sie stehen in fast jedem Satz und wuerden jeden Eintrag
 * gleichermassen treffen – „das ist mir zu teuer" soll ueber „teuer" gefunden
 * werden und nicht ueber „ist".
 */
const FUELLWOERTER = new Set([
  'aber',
  'alle',
  'als',
  'am',
  'an',
  'auch',
  'auf',
  'aus',
  'bei',
  'bin',
  'bis',
  'da',
  'dann',
  'das',
  'dass',
  'dem',
  'den',
  'denn',
  'der',
  'des',
  'die',
  'doch',
  'dort',
  'du',
  'ein',
  'eine',
  'einem',
  'einen',
  'einer',
  'eines',
  'er',
  'es',
  'euch',
  'fuer',
  'ganz',
  'hab',
  'habe',
  'haben',
  'hat',
  'ich',
  'ihm',
  'ihn',
  'ihr',
  'im',
  'in',
  'ist',
  'ja',
  'jetzt',
  'kein',
  'keine',
  'keinen',
  'mal',
  'man',
  'mehr',
  'mein',
  'meine',
  'mich',
  'mir',
  'mit',
  'nach',
  'nicht',
  'noch',
  'nun',
  'nur',
  'ob',
  'oder',
  'schon',
  'sehr',
  'sein',
  'seine',
  'sich',
  'sie',
  'sind',
  'so',
  'uns',
  'unser',
  'und',
  'vom',
  'von',
  'vor',
  'war',
  'waren',
  'was',
  'wenn',
  'werden',
  'wie',
  'wir',
  'wird',
  'zu',
  'zum',
  'zur',
])

// --- Zerlegen --------------------------------------------------------------

/** Kleinschreibung, Umlaute ausgeschrieben, alles Uebrige zu Leerzeichen. */
export function normalisieren(text: string) {
  return text
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Grobe Stammform. Kein vollstaendiger Stemmer – nur die Endungen, die im
 * Deutschen zwischen Nennform und gebeugter Form stehen. Der Rest der
 * Aehnlichkeit faellt ohnehin an die Themen und den Tippfehler-Abstand.
 */
const ENDUNGEN = [
  'ungen',
  'ung',
  'keit',
  'heit',
  'lich',
  'isch',
  'ern',
  'em',
  'en',
  'er',
  'es',
  'e',
  'n',
  's',
]

export function stamm(wort: string) {
  if (wort.length <= 4) return wort
  for (const endung of ENDUNGEN) {
    if (wort.endsWith(endung) && wort.length - endung.length >= 4) {
      return wort.slice(0, -endung.length)
    }
  }
  return wort
}

function woerter(text: string) {
  return normalisieren(text)
    .split(' ')
    .filter((w) => w.length > 1)
}

/** Wortstaemme eines Textes, ohne Fuellwoerter. */
export function staemme(text: string) {
  const roh = woerter(text)
  const ohneFuellwoerter = roh.filter((w) => !FUELLWOERTER.has(w))
  // Wer nur Fuellwoerter tippt ("das ist"), soll trotzdem etwas finden.
  const brauchbar = ohneFuellwoerter.length > 0 ? ohneFuellwoerter : roh
  return brauchbar.map(stamm)
}

/** Wortstamm -> Themen, einmal beim Laden des Moduls aufgebaut. */
const THEMA_JE_STAMM = new Map<string, string[]>()
for (const thema of THEMEN) {
  for (const wort of thema.woerter) {
    const schluessel = stamm(normalisieren(wort))
    const bisher = THEMA_JE_STAMM.get(schluessel)
    if (bisher) {
      if (!bisher.includes(thema.id)) bisher.push(thema.id)
    } else {
      THEMA_JE_STAMM.set(schluessel, [thema.id])
    }
  }
}

export const THEMA_LABEL = new Map(THEMEN.map((t) => [t.id, t.label]))

function themenVon(staemmeListe: string[]) {
  const gefunden = new Set<string>()
  for (const s of staemmeListe) {
    for (const id of THEMA_JE_STAMM.get(s) ?? []) gefunden.add(id)
  }
  return gefunden
}

// --- Tippfehler ------------------------------------------------------------

/** Levenshtein-Abstand mit Abbruch, sobald das Limit ueberschritten ist. */
export function abstand(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const aktuelle = [i]
    let kleinste = i
    for (let j = 1; j <= b.length; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1
      const wert = Math.min(aktuelle[j - 1]! + 1, vorige[j]! + 1, vorige[j - 1]! + kosten)
      aktuelle.push(wert)
      if (wert < kleinste) kleinste = wert
    }
    if (kleinste > limit) return limit + 1
    vorige = aktuelle
  }
  return vorige[b.length]!
}

/** Ab wann ein Tippfehler noch als Treffer durchgeht. */
function toleranz(wort: string) {
  if (wort.length <= 4) return 0
  if (wort.length <= 7) return 1
  return 2
}

// --- Bewertung -------------------------------------------------------------

export type Durchsuchbar = {
  title: string
  variants: string[]
  tags: string[]
  answer: string
  followUp?: string | null
  kategorieLabel: string
  helpful: number
}

type Feld = {
  staemme: Set<string>
  themen: Set<string>
  text: string
  gewicht: number
  /**
   * Kopf-Felder sind der Einwand selbst: Ueberschrift, Formulierungen,
   * Schlagworte, Thema. Ein Treffer dort ist ein Treffer; einer nur im
   * Antworttext ist ein Hinweis.
   */
  kopf: boolean
}

export type IndexEintrag<T> = { eintrag: T; felder: Feld[] }

export type Treffer<T> = {
  eintrag: T
  punkte: number
  /** Punkte im Verhaeltnis zum besten Treffer. */
  relevanz: number
  /**
   * Der Einwand selbst passt – nicht nur ein Wort im Antworttext. Das trennt
   * die Trefferliste von den entfernt verwandten Eintraegen darunter.
   */
  kern: boolean
  /** Warum der Eintrag getroffen hat, in Worten: „Preis", „Wettbewerb". */
  themen: string[]
}

/**
 * Gewichte der Felder. Die Ueberschrift ist der Einwand selbst und wiegt am
 * schwersten; der Antworttext trifft oft nur beilaeufig und wiegt am wenigsten,
 * bringt aber die Eintraege, in denen das Stichwort nur im Fliesstext steht.
 */
const GEWICHT = { titel: 6, varianten: 4.5, tags: 3, kategorie: 2, antwort: 1.2, rueckfrage: 0.8 }

function feld(text: string, gewicht: number, kopf = false): Feld {
  const s = staemme(text)
  return { staemme: new Set(s), themen: themenVon(s), text: normalisieren(text), gewicht, kopf }
}

/**
 * Eintraege einmal vorbereiten. Die Zerlegung je Tastendruck neu zu rechnen
 * waere Verschwendung – der Bestand aendert sich nur, wenn jemand etwas anlegt.
 */
export function indexieren<T extends Durchsuchbar>(eintraege: T[]): IndexEintrag<T>[] {
  return eintraege.map((eintrag) => ({
    eintrag,
    felder: [
      feld(eintrag.title, GEWICHT.titel, true),
      feld(eintrag.variants.join(' . '), GEWICHT.varianten, true),
      feld(eintrag.tags.join(' . '), GEWICHT.tags, true),
      feld(eintrag.kategorieLabel, GEWICHT.kategorie, true),
      feld(eintrag.answer, GEWICHT.antwort),
      feld(eintrag.followUp ?? '', GEWICHT.rueckfrage),
    ],
  }))
}

/** Ab hier ist ein Treffer nur noch Rauschen. */
const MINDESTPUNKTE = 1

/**
 * Bewertet einen Eintrag gegen die Anfrage.
 *
 * Pro Suchwort zaehlt der beste Fund im jeweiligen Feld: Volltreffer vor
 * Wortanfang vor Tippfehler. Dazu kommen die Themen – sie sind der Grund,
 * warum „zu teuer" auch die Eintraege zu Preiserhoehung und Rabatt findet.
 */
function bewerten<T>(
  kandidat: IndexEintrag<T>,
  anfrage: { staemme: string[]; themen: Set<string>; text: string },
  helpful: number,
) {
  let punkte = 0
  let kern = false
  const getroffeneWorte = new Set<string>()
  const getroffeneThemen = new Set<string>()

  for (const f of kandidat.felder) {
    if (f.staemme.size === 0) continue

    for (const wort of anfrage.staemme) {
      let anteil = 0
      if (f.staemme.has(wort)) {
        anteil = 1
      } else {
        for (const kandidatWort of f.staemme) {
          if (wort.length >= 3 && kandidatWort.startsWith(wort)) {
            anteil = Math.max(anteil, 0.7)
          } else if (kandidatWort.length >= 4 && wort.startsWith(kandidatWort)) {
            anteil = Math.max(anteil, 0.7)
          } else {
            const grenze = toleranz(wort)
            if (grenze > 0 && abstand(wort, kandidatWort, grenze) <= grenze) {
              anteil = Math.max(anteil, 0.45)
            }
          }
          if (anteil === 1) break
        }
      }
      if (anteil > 0) {
        punkte += anteil * f.gewicht
        getroffeneWorte.add(wort)
        if (f.kopf) kern = true
      }
    }

    for (const thema of anfrage.themen) {
      if (f.themen.has(thema)) {
        punkte += 0.55 * f.gewicht
        getroffeneThemen.add(thema)
        if (f.kopf) kern = true
      }
    }
  }

  if (punkte === 0) return null

  // Wer alle Suchwoerter unterbringt, steht ueber dem, der nur eines trifft.
  // Themen zaehlen hier nicht mit: sie sind der Umweg, nicht das gesuchte Wort.
  const abdeckung = getroffeneWorte.size / anfrage.staemme.length
  punkte *= 0.55 + 0.45 * Math.min(1, abdeckung)

  // Die getippte Wendung woertlich im Eintrag: der deutlichste Fall ueberhaupt.
  if (anfrage.text.length >= 5) {
    const [titel, varianten, tags, , antwort] = kandidat.felder
    if (titel!.text.includes(anfrage.text)) punkte += 14
    else if (varianten!.text.includes(anfrage.text)) punkte += 9
    else if (tags!.text.includes(anfrage.text) || antwort!.text.includes(anfrage.text)) punkte += 4
  }

  // Was sich im Gespraech bewaehrt hat, steht bei gleichem Treffer oben.
  punkte += Math.min(helpful, 25) * 0.08

  return {
    punkte,
    kern,
    themen: [...getroffeneThemen].map((id) => THEMA_LABEL.get(id) ?? id),
  }
}

/**
 * Sucht im vorbereiteten Bestand. Leere Anfrage heisst: kein Treffer, keine
 * Sortierung – die Oberflaeche zeigt dann ihre eigene Uebersicht.
 */
export function suchen<T extends Durchsuchbar>(
  index: IndexEintrag<T>[],
  suchbegriff: string,
): Treffer<T>[] {
  const text = normalisieren(suchbegriff)
  if (!text) return []

  const anfrageStaemme = [...new Set(staemme(suchbegriff))]
  if (anfrageStaemme.length === 0) return []
  const anfrage = { staemme: anfrageStaemme, themen: themenVon(anfrageStaemme), text }

  const treffer: Omit<Treffer<T>, 'relevanz'>[] = []
  for (const kandidat of index) {
    const bewertung = bewerten(kandidat, anfrage, kandidat.eintrag.helpful)
    if (bewertung && bewertung.punkte >= MINDESTPUNKTE) {
      treffer.push({ eintrag: kandidat.eintrag, ...bewertung })
    }
  }

  treffer.sort((a, b) => b.punkte - a.punkte)
  const beste = treffer[0]?.punkte ?? 1
  return treffer.map((t) => ({ ...t, relevanz: t.punkte / beste }))
}

/** Bequemer Einstieg fuer Tests und einmalige Abfragen. */
export function sucheEinwaende<T extends Durchsuchbar>(eintraege: T[], suchbegriff: string) {
  return suchen(indexieren(eintraege), suchbegriff)
}
