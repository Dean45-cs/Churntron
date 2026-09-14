/**
 * Startbestand der Einwand-Wiki.
 *
 * Anders als der Provisionskatalog ist das hier keine Preisliste, sondern ein
 * Anfang: Der Seed legt jeden Eintrag genau einmal an – erkennbar am `key` – und
 * fasst ihn danach nie wieder an. Was das Team in der Oberflaeche daraus macht,
 * bleibt stehen. Neue Einwandbehandlungen entstehen im Betrieb ueber die
 * Oberflaeche und nicht in dieser Datei; sie traegt nur den Grundstock, damit
 * die Wiki am ersten Tag nicht leer ist.
 *
 * Die Texte sind Formulierungshilfen, keine Skripte zum Ablesen. Und wie
 * ueberall im Projekt gilt: keine Klardaten. Hier steht, WAS gesagt wird, nie
 * von wem.
 */

export type ObjectionCategoryKey =
  | 'PRICE'
  | 'COMPETITOR'
  | 'TECHNICAL'
  | 'CONSTRUCTION'
  | 'SERVICE'
  | 'TIMING'
  | 'NEED'
  | 'DECISION'
  | 'CONTRACT'
  | 'TRUST'
  | 'OTHER'

export type ObjectionTemplate = {
  /** Stabiler Schluessel. Daran erkennt der Seed, was von ihm stammt. */
  key: string
  /** Der Einwand als Ueberschrift – moeglichst im Wortlaut des Kunden. */
  title: string
  category: ObjectionCategoryKey
  /**
   * Andere Formulierungen desselben Einwands. Sie tragen die Suche: getippt
   * wird, was gerade gesagt wurde, nicht die Ueberschrift.
   */
  variants: string[]
  /** Die Einwandbehandlung. Zeilenumbrueche bleiben in der Anzeige erhalten. */
  answer: string
  /** Die Rueckfrage, die das Gespraech danach weitertraegt. */
  followUp?: string
  tags: string[]
}

export const OBJECTION_CATALOG: readonly ObjectionTemplate[] = [
  // --- Preis ---------------------------------------------------------------
  {
    key: 'zu-teuer',
    title: 'Das ist mir zu teuer',
    category: 'PRICE',
    variants: [
      'zu teuer',
      'kostet zu viel',
      'das kann ich mir nicht leisten',
      'zu teuer geworden',
      'so viel Geld für Internet',
      'das ist mir zu viel',
    ],
    answer:
      'Verstehe ich – über den Preis reden wir gleich. Vorher eine Frage: zu teuer verglichen womit?\nMeist ist der Vergleich der alte Vertrag – und der lief über eine Leitung, die sich alle Nachbarn geteilt haben.\nBei uns liegt die Faser bis in die Wohnung: Die Bandbreite steht auch um 20 Uhr.\nAuf den Tag gerechnet ist das der Gegenwert eines Kaffees – für eine Leitung, an der die ganze Familie gleichzeitig hängt.',
    followUp: 'Wenn der Preis passen würde – wäre der Rest für Sie in Ordnung?',
    tags: ['Preis', 'Budget', 'Vergleich', 'Nutzen'],
  },
  {
    key: 'preiserhoehung',
    title: 'Sie haben die Preise erhöht',
    category: 'PRICE',
    variants: [
      'Preiserhöhung',
      'wird immer teurer',
      'jedes Jahr mehr',
      'Erhöhung nicht akzeptiert',
      'deswegen kündige ich',
    ],
    answer:
      'Dass eine Erhöhung ärgert, wenn sich am Anschluss nichts ändert, kann ich gut nachvollziehen.\nVerändert hat sich der Ausbau dahinter: Kapazität, Technik, Entstörung.\nWichtiger ist Ihr konkreter Vertrag – oft passt inzwischen ein anderer Tarif besser zu dem, was Sie wirklich nutzen.\nDer Wechsel in diesen Tarif kostet Sie nichts.',
    followUp: 'Darf ich Ihnen kurz zeigen, was Sie bei gleicher Leistung heute zahlen würden?',
    tags: ['Preis', 'Erhöhung', 'Kündigung', 'Tarifwechsel'],
  },
  {
    key: 'rabatt-gefordert',
    title: 'Was können Sie mir beim Preis entgegenkommen?',
    category: 'PRICE',
    variants: [
      'Rabatt',
      'Nachlass',
      'was geht am Preis',
      'gibt es einen Bonus',
      'nur wenn Sie mir entgegenkommen',
    ],
    answer:
      'Den Preis verhandle ich nicht frei – aber die aktuellen Aktionen gebe ich Ihnen vollständig weiter.\nDie größere Ersparnis steckt meist woanders: im passenden Tarif.\nViele zahlen jeden Monat für Bandbreite, die sie nie brauchen.',
    followUp: 'Wie viele Geräte hängen bei Ihnen abends gleichzeitig am Netz?',
    tags: ['Preis', 'Rabatt', 'Aktion', 'Tarifwechsel'],
  },

  // --- Wettbewerb ----------------------------------------------------------
  {
    key: 'woanders-guenstiger',
    title: 'Woanders bekomme ich das günstiger',
    category: 'COMPETITOR',
    variants: [
      'bei der Telekom billiger',
      'Vodafone ist günstiger',
      'anderer Anbieter kostet weniger',
      'ich habe ein besseres Angebot',
    ],
    answer:
      'Kann gut sein – nur sagt der reine Monatspreis wenig. Drei Fragen entscheiden.\nErstens: Was kostet es nach der Aktionszeit?\nZweitens: Liegt Glasfaser bis in die Wohnung oder nur bis zum Verteiler?\nDrittens: Wer ist dran, wenn etwas ausfällt? Wir sind hier vor Ort, die Technik ist unsere eigene.',
    followUp: 'Was steht bei dem Angebot ab dem 13. Monat?',
    tags: ['Wettbewerb', 'Preis', 'Vergleich', 'Aktionspreis'],
  },
  {
    key: 'schon-anbieter',
    title: 'Ich habe schon einen Anbieter',
    category: 'COMPETITOR',
    variants: [
      'bin schon versorgt',
      'ich bin zufrieden mit meinem Anbieter',
      'habe schon Internet',
      'bin bei einem anderen unter Vertrag',
    ],
    answer:
      'Gut – dann wissen Sie ja, worauf es ankommt. Ich will Ihnen nichts wegnehmen, was funktioniert.\nDer Punkt ist ein anderer: Glasfaser wird hier einmal gebaut.\nWer beim Ausbau dabei ist, bekommt den Hausanschluss zu Bedingungen, die es später so nicht mehr gibt.\nWir merken den Anschluss vor – wann Sie umsteigen, entscheiden Sie.',
    followUp: 'Wann läuft Ihr jetziger Vertrag aus?',
    tags: ['Wettbewerb', 'Bestandskunde', 'Ausbau', 'Laufzeit'],
  },
  {
    key: 'wechsel-zu-aufwendig',
    title: 'Ein Wechsel ist mir zu viel Aufwand',
    category: 'COMPETITOR',
    variants: [
      'zu kompliziert',
      'zu viel Papierkram',
      'dann bin ich tagelang ohne Internet',
      'das mache ich mir nicht an',
    ],
    answer:
      'Der Aufwand liegt bei uns, nicht bei Ihnen.\nKündigung beim alten Anbieter, Terminabstimmung, Rufnummernmitnahme – das übernehmen wir.\nGesetzlich darf Ihr Anschluss beim Wechsel höchstens einen Tag ausfallen.\nIn der Praxis läuft die Umschaltung meist am selben Vormittag.',
    followUp: 'Wenn ich Ihnen den Wechsel komplett abnehme – passt es dann?',
    tags: ['Wechsel', 'Aufwand', 'Anbieterwechsel', 'Ausfall'],
  },

  // --- Technik -------------------------------------------------------------
  {
    key: 'dsl-reicht',
    title: 'Meine jetzige Leitung reicht mir völlig',
    category: 'NEED',
    variants: [
      '50 Mbit reichen',
      'ich brauche keine 1000',
      'wir surfen doch nur',
      'so schnelles Internet brauche ich nicht',
      'DSL reicht',
    ],
    answer:
      'Heute stimmt das oft. Die Frage ist nur nicht, was Sie surfen – sondern wie viele Geräte gleichzeitig ziehen.\nFernseher, zwei Handys, Homeoffice, dazu die Updates im Hintergrund.\nGenau dann bricht eine Kupferleitung ein: abends, wenn alle zu Hause sind.\nGlasfaser hält die Bandbreite auch dann – und trägt alles, was in fünf Jahren normal ist.',
    followUp: 'Wie oft ruckelt es bei Ihnen abends beim Streamen?',
    tags: ['Bedarf', 'Bandbreite', 'Technik', 'Zukunft'],
  },
  {
    key: 'leitung-instabil',
    title: 'Bei Ihnen läuft die Leitung nicht stabil',
    category: 'TECHNICAL',
    variants: [
      'ständig Verbindungsabbrüche',
      'die Bandbreite kommt nie an',
      'Internet fällt dauernd aus',
      'ich zahle für 1000 und bekomme 200',
    ],
    answer:
      'Das ist ein berechtigter Grund für Ärger, und dem gehen wir nach.\nZwei Dinge trennen wir dabei: die Leitung bis zum Anschluss – und alles, was danach im Haus passiert.\nIch lasse die Leitung messen. Kommt die Bandbreite am Anschluss nicht an, ist das unser Fehler und wird behoben.\nLiegt es am WLAN, bekommen wir das mit dem richtigen Router-Standort meist im selben Gespräch hin.',
    followUp: 'Hängt der Rechner per Kabel oder über WLAN am Router?',
    tags: ['Technik', 'Störung', 'Bandbreite', 'WLAN'],
  },
  {
    key: 'stoerung-nicht-behoben',
    title: 'Meine Störung wurde nie behoben',
    category: 'SERVICE',
    variants: [
      'niemand hat sich gekümmert',
      'der Techniker kam nicht',
      'seit Wochen keine Rückmeldung',
      'immer wieder dasselbe Problem',
    ],
    answer:
      'Das darf nicht passieren, und ich rede es nicht klein.\nIch schaue jetzt in den Vorgang und sage Ihnen ehrlich, was ich sehe – auch wenn es nicht schmeichelhaft ist.\nAb hier haben Sie einen Namen: Ich bleibe an dem Fall.\nIch melde mich wieder, auch wenn es nichts Neues gibt.',
    followUp: 'Wann passt Ihnen ein Rückruf, wenn ich den Stand geklärt habe?',
    tags: ['Service', 'Störung', 'Eskalation', 'Vertrauen'],
  },

  // --- Bau -----------------------------------------------------------------
  {
    key: 'garten-aufgraben',
    title: 'Ich will nicht, dass mein Garten aufgegraben wird',
    category: 'CONSTRUCTION',
    variants: [
      'Baustelle im Vorgarten',
      'Dreck und Lärm',
      'wer macht das wieder heil',
      'da wird alles kaputt gemacht',
      'ich will keine Löcher in der Wand',
    ],
    answer:
      'Die Sorge höre ich oft, und sie ist berechtigt – es ist Ihr Grundstück.\nDie Trasse stimmen wir vorher mit Ihnen ab, meist über eine Spülbohrung ohne offenen Graben.\nIns Haus geht es durch ein Kernloch von der Dicke eines Daumens.\nAlles wird fachgerecht wiederhergestellt – den Rasen finden Sie nach ein paar Wochen nicht mehr.',
    followUp: 'Wollen wir gemeinsam schauen, wo der Anschluss ins Haus kommen soll?',
    tags: ['Bau', 'Hausanschluss', 'Grundstück', 'Wiederherstellung'],
  },
  {
    key: 'mieter-nicht-zustaendig',
    title: 'Ich bin nur Mieter, das entscheidet der Vermieter',
    category: 'DECISION',
    variants: [
      'Mietwohnung',
      'Hausverwaltung muss zustimmen',
      'gehört mir ja nicht',
      'da darf ich nichts entscheiden',
    ],
    answer:
      'Richtig, der Hausanschluss braucht die Zustimmung des Eigentümers – den Vertrag schließen aber Sie.\nFür die Eigentümer haben wir ein Standardformular, das der Hausverwaltung die Arbeit abnimmt.\nWir gehen direkt auf sie zu, das müssen Sie nicht übernehmen.\nOhne Zustimmung entsteht Ihnen kein Vertrag und keine Kosten – Sie verlieren nichts dabei.',
    followUp: 'Darf ich die Hausverwaltung selbst anschreiben – wie heißt sie?',
    tags: ['Vermieter', 'Mietwohnung', 'Zustimmung', 'Hausanschluss'],
  },

  // --- Service -------------------------------------------------------------
  {
    key: 'schlechte-erfahrung',
    title: 'Mit Ihnen habe ich schlechte Erfahrungen gemacht',
    category: 'SERVICE',
    variants: [
      'nie wieder',
      'letztes Mal hat gar nichts geklappt',
      'ihr habt mich hängen lassen',
      'unzufrieden mit dem Service',
    ],
    answer:
      'Danke, dass Sie es überhaupt noch sagen – die meisten legen einfach auf.\nDas Vergangene kann ich nicht wegdiskutieren, und ich versuche es auch nicht.\nWas ich anbieten kann: Ich schaue nach, was damals schiefgelaufen ist, und sage Ihnen, was wir geändert haben.\nIch bleibe Ihr Ansprechpartner. Wenn Sie danach nein sagen, ist das in Ordnung.',
    followUp: 'Was müsste passieren, damit Sie uns noch einmal eine Chance geben?',
    tags: ['Service', 'Vertrauen', 'Beschwerde', 'Rückgewinnung'],
  },
  {
    key: 'warteschleife',
    title: 'Bei Ihnen kommt man telefonisch nie durch',
    category: 'SERVICE',
    variants: ['ewig in der Warteschleife', 'nie erreichbar', 'immer nur Band', 'keiner geht ran'],
    answer:
      'Zu den Stoßzeiten stimmt das leider, und daran arbeiten wir.\nFür Sie ändert sich das jetzt konkret: Sie haben meinen Namen und meine Durchwahl.\nWas wir hier besprechen, dokumentiere ich im Vorgang.\nDann müssen Sie es beim nächsten Anruf nicht wieder von vorne erzählen.',
    followUp: 'Soll ich Ihnen meine Durchwahl durchgeben?',
    tags: ['Service', 'Erreichbarkeit', 'Hotline', 'Vertrauen'],
  },

  // --- Zeit ----------------------------------------------------------------
  {
    key: 'keine-zeit',
    title: 'Ich habe gerade keine Zeit',
    category: 'TIMING',
    variants: [
      'ich bin gerade beim Essen',
      'passt gerade schlecht',
      'ich bin unterwegs',
      'ich muss gleich los',
      'rufen Sie später an',
    ],
    answer:
      'Kein Problem, ich halte Sie nicht auf. Zwei Sätze, dann wissen Sie, ob es sich für Sie lohnt.\nWenn nicht, sind wir in einer Minute durch.\nWenn doch, machen wir einen festen Termin aus.\nDann rufe ich an, wenn es Ihnen wirklich passt – statt Sie noch dreimal zu erwischen.',
    followUp: 'Passt Ihnen heute Abend besser oder morgen früh?',
    tags: ['Zeit', 'Rückruf', 'Termin', 'Gesprächseinstieg'],
  },
  {
    key: 'ich-melde-mich',
    title: 'Ich melde mich, wenn ich Interesse habe',
    category: 'TIMING',
    variants: [
      'ich komme darauf zurück',
      'ich rufe an, wenn es soweit ist',
      'lassen Sie mir Zeit',
      'ich melde mich selbst',
    ],
    answer:
      'Gerne – erfahrungsgemäß geht es im Alltag unter, und das wäre schade.\nDie Ausbaukonditionen sind an einen Zeitraum gebunden.\nMachen wir es andersherum: Ich rufe in zwei Wochen noch einmal an.\nSagen Sie dann, es ist erledigt, ist es erledigt – und Sie hören nichts mehr von mir.',
    followUp: 'Zwei Wochen – oder ist Ihnen ein Monat lieber?',
    tags: ['Zeit', 'Wiedervorlage', 'Rückruf', 'Verbindlichkeit'],
  },

  // --- Bedarf --------------------------------------------------------------
  {
    key: 'kein-interesse',
    title: 'Kein Interesse',
    category: 'NEED',
    variants: [
      'brauche ich nicht',
      'will ich nicht',
      'nicht interessiert',
      'lassen Sie es gut sein',
    ],
    answer:
      'Alles gut – ein Satz, worum es geht, dann entscheiden Sie.\nEs geht nicht um einen Vertrag heute, sondern darum, dass hier gerade Glasfaser gebaut wird.\nWer beim Ausbau dabei ist, bekommt den Hausanschluss ohne die Kosten, die später anfallen.\nDas ist der ganze Grund für den Anruf.',
    followUp: 'Wussten Sie überhaupt, dass bei Ihnen gebaut wird?',
    tags: ['Bedarf', 'Einstieg', 'Ausbau', 'Abwehr'],
  },
  {
    key: 'zu-alt',
    title: 'Dafür bin ich zu alt',
    category: 'NEED',
    variants: [
      'in meinem Alter lohnt sich das nicht',
      'ich nutze das Internet kaum',
      'ich habe nur ein Tablet',
      'das brauche ich nicht mehr',
    ],
    answer:
      'Verstehe ich – ich rede Ihnen nichts ein, was Sie nicht nutzen.\nZwei Punkte zählen trotzdem oft. Der erste: Das alte Kupfernetz wird nach und nach abgeschaltet.\nIrgendwann ist es kein Wechsel mehr, sondern eine Umstellung unter Zeitdruck.\nDer zweite: Wenn Kinder oder Enkel zu Besuch sind, hängt plötzlich das halbe Haus am Netz.\nDer Anschluss lässt sich legen, ohne dass sich für Sie heute etwas ändert.',
    followUp: 'Telefonieren Sie noch über die Festnetzleitung?',
    tags: ['Bedarf', 'Kupferabschaltung', 'Zukunft', 'Senioren'],
  },
  {
    key: 'kein-tv-bedarf',
    title: 'Fernsehen brauche ich nicht dazu',
    category: 'NEED',
    variants: [
      'ich streame nur',
      'ich habe Netflix',
      'TV brauche ich nicht',
      'ich schaue kaum fern',
    ],
    answer:
      'Dann lassen wir es weg – ein Paket, das Sie nicht nutzen, ärgert Sie in drei Monaten.\nInteressant ist es nur in einem Fall: wenn Sie ohnehin für Kabel-TV zahlen.\nDann ist unser TV-Paket meist günstiger als das, was heute auf der Nebenkostenabrechnung steht.',
    followUp: 'Steht bei Ihnen Kabelfernsehen in den Nebenkosten?',
    tags: ['Zusatzprodukt', 'TV', 'Streaming', 'Bedarf'],
  },

  // --- Entscheidung --------------------------------------------------------
  {
    key: 'mit-partner-besprechen',
    title: 'Das muss ich erst mit meiner Frau besprechen',
    category: 'DECISION',
    variants: [
      'mit meinem Mann besprechen',
      'das entscheide ich nicht allein',
      'Rücksprache mit der Familie',
      'da rede ich erst mit meinem Partner',
    ],
    answer:
      'Selbstverständlich, so eine Entscheidung trifft man gemeinsam.\nDamit Sie es nicht aus dem Kopf erzählen müssen, fasse ich die drei Punkte zusammen: Preis, Laufzeit, Termin.\nUnd damit die Frage nicht offenbleibt: Ich rufe übermorgen noch einmal an, wenn Sie beide Zeit hatten.',
    followUp: 'Wann sind Sie beide zu Hause – eher abends?',
    tags: ['Entscheidung', 'Partner', 'Wiedervorlage', 'Zusammenfassung'],
  },
  {
    key: 'bedenkzeit',
    title: 'Ich muss darüber nachdenken',
    category: 'DECISION',
    variants: [
      'ich überlege es mir',
      'lassen Sie mich schlafen darüber',
      'ich brauche Bedenkzeit',
      'das ist mir zu schnell',
    ],
    answer:
      'Klar, überlegen Sie in Ruhe.\nMeistens steckt hinter dem Nachdenken aber ein konkreter Punkt: der Preis, die Laufzeit oder der Bau.\nWenn ich weiß, welcher es ist, beantworte ich ihn Ihnen jetzt – statt dass Sie damit alleine sitzen.',
    followUp: 'Was ist der Punkt, der Sie noch zögern lässt?',
    tags: ['Entscheidung', 'Bedenkzeit', 'Abschluss', 'Rückfrage'],
  },

  // --- Vertrag -------------------------------------------------------------
  {
    key: 'laufzeit-zu-lang',
    title: '24 Monate sind mir zu lang',
    category: 'CONTRACT',
    variants: [
      'ich will mich nicht binden',
      'Laufzeit zu lang',
      'zwei Jahre sind zu viel',
      'gibt es das auch monatlich kündbar',
    ],
    answer:
      'Die Laufzeit ist der Grund, warum der Preis so ist, wie er ist – wir bauen Ihnen einen Anschluss, der bleibt.\nZwei Dinge nehmen der Bindung die Schärfe.\nNach den 24 Monaten ist der Vertrag monatlich kündbar.\nUnd bei einem Umzug ziehen wir den Anschluss mit um, wenn wir dort ausgebaut haben.',
    followUp: 'Planen Sie in den nächsten zwei Jahren einen Umzug?',
    tags: ['Vertrag', 'Laufzeit', 'Bindung', 'Umzug'],
  },
  {
    key: 'kuendigung-umzug',
    title: 'Ich kündige, weil ich umziehe',
    category: 'CONTRACT',
    variants: [
      'Umzug',
      'ich ziehe aus',
      'neue Wohnung',
      'ich brauche den Anschluss dort nicht mehr',
    ],
    answer:
      'Dann prüfen wir zuerst, ob wir an der neuen Adresse ausgebaut haben.\nWenn ja, nehmen Sie Vertrag und Rufnummer einfach mit – ohne neue Laufzeit.\nWenn nicht, ist die Kündigung sauber und wir merken die Adresse für den Ausbau vor.\nBeides ist besser als ein Vertrag, der ins Leere läuft.',
    followUp: 'Wie lautet die neue Adresse – ich schaue direkt nach?',
    tags: ['Umzug', 'Kündigung', 'Mitnahme', 'Ausbaugebiet'],
  },
  {
    key: 'widerruf-rueckgaengig',
    title: 'Ich habe widerrufen und will nichts mehr davon hören',
    category: 'CONTRACT',
    variants: [
      'Widerruf',
      'ich habe den Vertrag widerrufen',
      'das war ein Fehler',
      'ich habe mich überrumpeln lassen',
    ],
    answer:
      'Ihr Widerruf gilt, daran rüttle ich nicht – dafür ist die Frist da.\nMich interessiert nur der Grund: die Art, wie der Vertrag zustande kam, oder der Vertrag selbst?\nWar es die Situation, möchte ich mich dafür entschuldigen.\nWar es der Vertrag, finden wir vielleicht etwas, das besser passt.',
    followUp: 'Was war es bei Ihnen – die Situation oder der Vertrag?',
    tags: ['Widerruf', 'Vertrag', 'Rückgewinnung', 'Vertrauen'],
  },

  // --- Vertrauen -----------------------------------------------------------
  {
    key: 'unterlagen-schicken',
    title: 'Schicken Sie mir das erst mal schriftlich',
    category: 'TRUST',
    variants: [
      'schicken Sie mir Unterlagen',
      'per Post',
      'per Mail zusenden',
      'ich will das schwarz auf weiß',
    ],
    answer:
      'Mache ich gerne – schriftlich haben Sie es ohnehin, bevor irgendetwas gilt.\nNur bringt Ihnen ein Prospekt wenig, wenn nicht drinsteht, was für Ihre Adresse gilt.\nDeshalb klären wir die zwei Punkte jetzt kurz.\nDann schicke ich Ihnen genau das zu, was auf Sie passt.',
    followUp: 'An welche Adresse darf ich es schicken?',
    tags: ['Unterlagen', 'Schriftlich', 'Vertrauen', 'Hinhalten'],
  },
  {
    key: 'woher-nummer',
    title: 'Woher haben Sie meine Nummer?',
    category: 'TRUST',
    variants: [
      'ich will keine Werbeanrufe',
      'das ist unerlaubte Werbung',
      'Datenschutz',
      'löschen Sie meine Daten',
    ],
    answer:
      'Berechtigte Frage. Sie sind bei uns Kunde, beziehungsweise Ihrem Anschluss ist ein laufender Vorgang zugeordnet.\nDie Nummer stammt aus Ihren Vertragsdaten, nicht aus einer gekauften Liste.\nWenn Sie keine Anrufe wünschen, vermerke ich das sofort.\nDann ruft hier niemand mehr an.',
    followUp: 'Soll ich den Werbekontakt für Sie sperren?',
    tags: ['Datenschutz', 'Werbeanruf', 'Vertrauen', 'Widerspruch'],
  },
] as const

/** Wie viele Eintraege der Startbestand mitbringt – fuer Anzeige und Tests. */
export const OBJECTION_CATALOG_SIZE = OBJECTION_CATALOG.length
