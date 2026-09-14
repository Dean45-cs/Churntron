/**
 * Gespraechsleitfaden Winback – Universal (Outbound nach Kuendigungseingang).
 *
 * Diese Datei ist der Leitfaden. Sie bildet das Quelldokument ab, und zwar
 * 1:1: gleiche Phasennummern, gleicher Wortlaut bei allen O-Ton-Saetzen. Wenn
 * der Ausbilder "Phase 4" sagt, muss im Fenster Phase 4 stehen – deshalb wird
 * hier nicht umsortiert, gekuerzt oder umformuliert.
 *
 * Warum eine TypeScript-Datei und nicht MDX (so stand es urspruenglich in
 * PLAN.md): der Leitfaden ist keine Prosa, sondern Struktur – Phasen,
 * Zuordnungen, Eskalationsstufen, Einwaende. Genau diese Struktur traegt
 * spaeter den Typ-Filter und die Closer-Eskalation. MDX braeuchte erst eine
 * Pipeline und koennte die Struktur nicht liefern. Der Weg ist derselbe, den
 * commission-catalog.ts schon gegangen ist: erst Datei, spaeter Datenbank mit
 * Pflege in der Oberflaeche.
 *
 * Was das Dokument nur als Verweis nennt (Doc 02, Doc 05), steht hier als
 * Block der Art 'luecke' – sichtbar, nicht verschwiegen. Wer das Fenster
 * aufhat, soll auch sehen, was noch fehlt.
 */

/** Nicht jede Phase laeuft am Telefon. 0 ist Vorbereitung, 10 kommt danach. */
export type PhasenMoment = 'vorher' | 'gespraech' | 'danach'

/**
 * Ein Inhaltsblock einer Phase. Bewusst eine Liste statt fester Felder:
 * das Dokument mischt Erklaerung, O-Ton und Tabelle in eigener Reihenfolge,
 * und die Reihenfolge ist Teil der Aussage.
 */
export type Block =
  | { art: 'text'; titel?: string; text: string }
  /** Ein Satz, der wirklich vorgelesen wird. Wortlaut aus dem Dokument. */
  | { art: 'oTon'; wann?: string; satz: string }
  | { art: 'schritte'; titel?: string; punkte: string[] }
  | { art: 'zuordnung'; spalten: [string, string]; zeilen: { von: string; nach: string }[] }
  | { art: 'stufen'; titel?: string; punkte: string[] }
  /** Rendert die Einwandliste. Sie steht nur einmal in dieser Datei. */
  | { art: 'einwaende' }
  /** Was das Dokument offenlaesst oder auf ein anderes Doc verschiebt. */
  | { art: 'luecke'; text: string }

export type Phase = {
  nr: number
  titel: string
  /** Klammerzusatz aus der Ueberschrift, z. B. "erste 20 Sekunden". */
  zusatz?: string
  /** Kurzform fuer die Schrittleiste im schmalen Fenster. */
  kurz: string
  moment: PhasenMoment
  ziel?: string
  bloecke: Block[]
}

export type Einwand = { einwand: string; antwort: string; hinweis?: string }

/** Gilt in jeder Phase – steht deshalb in jeder Ansicht in der Fusszeile. */
export type Leitplanke = { regel: string; grund?: string }

const PHASEN: readonly Phase[] = [
  {
    nr: 0,
    titel: 'Vorbereitung',
    zusatz: 'vor dem Griff zum Hörer',
    kurz: 'Vorbereitung',
    moment: 'vorher',
    bloecke: [
      {
        art: 'schritte',
        titel: 'Check im CRM, bevor gewählt wird',
        punkte: [
          'Kündigungsgrund bereits erfasst? Wenn ja → direkt zu Phase 3 (Anerkennung)',
          'Vertragsdauer, aktueller Tarif, Reklamationshistorie',
          'Ist der Kunde ein Fall für die Wirtschaftlichkeits-Anzeige (Idee 7)? Falls noch nicht im CRM: grobe Faustregel im Kopf behalten – Sachwert vor Rabatt.',
        ],
      },
    ],
  },
  {
    nr: 1,
    titel: 'Einstieg',
    zusatz: 'erste 20 Sekunden',
    kurz: 'Einstieg',
    moment: 'gespraech',
    ziel: 'Erlaubnis zum Gespräch holen, kein Verkaufsdruck, keine erfundene Dringlichkeit.',
    bloecke: [
      {
        art: 'oTon',
        wann: 'Kevins Formulierung',
        satz: 'Moin, hallo, einmal Kevin von der TNG. Spreche ich da mit [Vorname]? Gut, ich bin einmal vom Qualitätsmanagement und habe hier einmal Ihre Kündigung auf den Tisch gelegt bekommen. Meine Aufgabe ist einmal, nachzuharken, wo der Schuh gedrückt hat.',
      },
      {
        art: 'text',
        titel: 'Warum das funktioniert',
        text: 'Kein Verkaufsanruf, sondern eine neutrale QM-Instanz, die nachhaken muss – der Kunde geht nicht sofort in Abwehrhaltung wie bei einem offensichtlichen Retention-Call. Der Auftrag kommt von oben, nicht vom Verkäufer selbst.',
      },
      {
        art: 'oTon',
        wann: 'Wenn abgelehnt – kein Drängen',
        satz: 'Kein Problem – darf ich Sie kurz zurückrufen, oder ist Ihnen eine Mail lieber?',
      },
    ],
  },
  {
    nr: 2,
    titel: 'Diagnose',
    zusatz: 'zuhören, dann ggf. nachhaken',
    kurz: 'Diagnose',
    moment: 'gespraech',
    ziel: 'Kündigertyp bestimmen, bevor irgendein Angebot fällt. Ohne Diagnose kein passender Closer.',
    bloecke: [
      {
        art: 'text',
        titel: 'Kevins Vorgehen',
        text: 'Der Einstieg aus Phase 1 – wo der Schuh gedrückt hat – ist schon die Frage. Die meisten Kunden fangen danach von selbst an zu erzählen. Keine zusätzliche Frage nötig.',
      },
      {
        art: 'oTon',
        wann: 'Falls vage oder ausweichend („passt einfach nicht mehr“, keine klare Antwort)',
        satz: 'Hätten wir irgendwas anders machen können?',
      },
      {
        art: 'text',
        text: 'Offener als eine Ja/Nein-Frage – holt auch Service- und Vertrauensthemen ans Licht, die der Kunde sonst nicht von selbst nennt.',
      },
      {
        art: 'zuordnung',
        spalten: ['Antwort deutet auf', 'Typ'],
        zeilen: [
          { von: 'Wettbewerber billiger, Rabatt woanders', nach: 'Preis-Kündiger' },
          { von: 'Störung, Wartezeit, schlechte Erfahrung', nach: 'Service-Kündiger' },
          { von: 'Zu langsam, braucht mehr Bandbreite oder Symmetrie', nach: 'Technik-Kündiger' },
          { von: 'Zieht um', nach: 'Umzugs-Kündiger' },
          { von: 'Kein aktiver Grund, Vertrag lief einfach aus', nach: 'Passiv-Kündiger' },
          { von: 'War früher Kunde, jetzt FTTH neu verfügbar', nach: 'Ex-Kunde neues FTTH-Gebiet' },
        ],
      },
    ],
  },
  {
    nr: 3,
    titel: 'Anerkennung + Erklärung',
    kurz: 'Anerkennung',
    moment: 'gespraech',
    ziel: 'Bevor ein Angebot kommt, muss der Kunde sich gehört fühlen – sonst wirkt jeder Closer wie Ablenkung.',
    bloecke: [
      {
        art: 'schritte',
        titel: 'Kevins Vorgehen',
        punkte: [
          'Dem Kunden erstmal recht geben',
          'Sich entschuldigen – aber nicht zu extrem, keine Übertreibung',
          'Währenddessen das Problem einordnen und erklären, um Verständnis beim Kunden zu erzeugen',
        ],
      },
      {
        art: 'text',
        titel: 'Der Trick',
        text: 'Die Erklärung läuft parallel zur Entschuldigung, nicht danach – dadurch klingt sie nicht wie eine Ausrede, sondern wie eine Einordnung. Der Kunde fühlt sich ernst genommen, ohne dass TNG sich komplett schuldig spricht.',
      },
      {
        art: 'luecke',
        text: 'Typspezifische Brückensätze – etwa für Preis- gegen Service-Kündiger – folgen, sobald es konkrete Formulierungen dafür gibt.',
      },
    ],
  },
  {
    nr: 4,
    titel: 'Zeit schinden + Lösung ermitteln',
    kurz: 'Lösung',
    moment: 'gespraech',
    ziel: 'Passenden Closer finden, ohne dass es nach Verkaufsskript klingt.',
    bloecke: [
      {
        art: 'text',
        titel: 'Kevins Vorgehen',
        text: 'Hängt von der Situation ab, kein starres Schema. Nach der Problem-Erklärung sagt Kevin sinngemäß:',
      },
      { art: 'oTon', satz: 'Ich schau mir das einmal an.' },
      {
        art: 'schritte',
        titel: 'Während dieser kurzen Pause',
        punkte: [
          'gewinnt er Zeit, um den passenden Closer zu ermitteln',
          'vermittelt er dem Kunden gleichzeitig „Ich setze mich für Sie ein“ und „Ich bin kompetent“ – nicht „Ich lese ein Angebot vor“',
        ],
      },
      {
        art: 'text',
        titel: 'Grundregel (P1)',
        text: 'Sachwert vor Rabatt. Nie mit der teuersten Stufe einsteigen.',
      },
      {
        art: 'stufen',
        titel: 'Eskalationslogik',
        punkte: [
          'leicht – zum Beispiel Bereitstellung frei und Routermiete frei',
          'mittel – zusätzlich eine moderate Preis- oder Laufzeitmaßnahme',
          'stark – zusätzlich Speed-Upgrade oder verlängerter Aktionspreis',
        ],
      },
      {
        art: 'oTon',
        wann: 'Falls eine Sachprämie gewählt wird (P2) – an eine Person im Haushalt binden, nicht an den Kunden selbst',
        satz: 'Sie haben doch [Kind/Partner erwähnt] – braucht der/die nicht [passende Prämie]?',
      },
      {
        art: 'luecke',
        text: 'Die Closer-Zuordnung je Kündigertyp (W1–W18, Top 3 je Typ) steht in Doc 02 und ist noch nicht eingebaut. Die Eskalationsstufen als konkrete Euro-Pakete stehen in Doc 05.',
      },
    ],
  },
  {
    nr: 5,
    titel: 'Nutzen zeigen, Einwand auflösen, abschließen',
    kurz: 'Nutzen',
    moment: 'gespraech',
    ziel: 'Nicht über den Preis gewinnen, sondern über den Nutzen – und die Entschuldigung direkt mit der Lösung verknüpfen.',
    bloecke: [
      {
        art: 'schritte',
        titel: 'Kevins Vorgehen',
        punkte: [
          'Nicht mit dem Preis überzeugen – außer der Kunde hatte explizit eine Preisbeschwerde. TNG ist ohnehin kostengünstig, das muss nicht extra verkauft werden.',
          'Über das Produkt gewinnen: den Nutzen von Glasfaser zeigen – Geschwindigkeit, Stabilität, Zukunftssicherheit.',
          'Den Einwand in die Lösung einbauen („Schleife“): die Entschuldigung direkt mit dem Zukunftsversprechen verbinden.',
          'Abschluss, sobald der Kunde den Sinn von Glasfaser sieht.',
        ],
      },
      {
        art: 'oTon',
        wann: 'Schleife, Beispiel schlechte Beratung',
        satz: 'Das tut mir leid, dass es bisher so gelaufen ist – das sollte natürlich nicht so sein. In Zukunft machen wir es besser.',
      },
      {
        art: 'oTon',
        wann: 'Abschluss',
        satz: 'Ok, dann nehme ich Ihre Kündigung zurück, und in Zukunft machen wir es besser.',
      },
      {
        art: 'text',
        text: 'Das ist gleichzeitig der Übergang zu Phase 9. Bei Kevin verschmelzen Nutzenargumentation, Einwandauflösung und Abschluss oft in einem durchgehenden Redefluss statt in klar getrennten Schritten.',
      },
      {
        art: 'luecke',
        text: 'Offen: Macht Kevin nach dem Angebot bewusst eine Pause (G7 Schweigen), oder führt er direkt in die Zusammenfassung über? Die Upselling-Argumente U3–U6 stehen in Doc 02.',
      },
    ],
  },
  {
    nr: 6,
    titel: 'Pause & ggf. Nutzen nachlegen',
    kurz: 'Pause',
    moment: 'gespraech',
    bloecke: [
      {
        art: 'text',
        titel: 'Kevins Vorgehen',
        text: 'Nach „in Zukunft machen wir es besser“ lässt Kevin den Kunden ausreden – hier entsteht die Pause, entspricht G7 Schweigen. Erst wenn sich abzeichnet, dass es schwierig werden könnte, legt er nach: mit dem Glasfaser-Nutzen und einem Argument, das der Kunde selbst schon geliefert hat.',
      },
      {
        art: 'oTon',
        wann: 'Bei drohender Absage',
        satz: 'Ja, ich weiß, es ist blöd gelaufen, in Zukunft läuft es besser. Sie haben ja extra schon den Anschluss in Ihr Gebäude bauen lassen, und das Glasfaser läuft ja. In Zukunft werde ich mich darum kümmern, dass Sie auch ein positives Erlebnis mit unserem Kundensupport haben, und Ihren Widerruf zurücknehmen.',
      },
      {
        art: 'text',
        titel: 'Warum das funktioniert',
        text: 'Der Verweis auf den bereits gebauten Anschluss ist ein Sunk-Cost-Argument – der Kunde hat selbst schon investiert, das spricht gegen einen Wechsel. Kevin nutzt das, statt es zu verschweigen.',
      },
    ],
  },
  {
    nr: 7,
    titel: 'Einwandbehandlung',
    kurz: 'Einwände',
    moment: 'gespraech',
    bloecke: [
      { art: 'einwaende' },
      {
        art: 'luecke',
        text: 'Die vollständige Liste inklusive der VVL-spezifischen Einwände steht in Doc 02, Teil 3.3.',
      },
    ],
  },
  {
    nr: 8,
    titel: 'Abschluss',
    kurz: 'Abschluss',
    moment: 'gespraech',
    bloecke: [
      {
        art: 'text',
        titel: 'Bei hartnäckigerem Widerstand',
        text: 'Zusätzliches Entgegenkommen als Wiedergutmachung anbieten, dann direkt fragen.',
      },
      {
        art: 'oTon',
        wann: 'Beispiel',
        satz: 'Als Entgegenkommen, dass Sie so eine negative Erfahrung gemacht haben, würde ich Ihnen auch noch einen 25/50 €-Amazon-Gutschein zukommen lassen. Ist das ein Deal?',
      },
      {
        art: 'text',
        text: 'Entspricht der Logik von W14, Gutschrift für den Ärger – hier konkret über einen Gutschein statt Rechnungsgutschrift gelöst. „Ist das ein Deal?“ ist Kevins Standard-Abschlussfrage: direkt, kein Herumreden.',
      },
      {
        art: 'oTon',
        wann: 'G1 Alternativ-Abschluss',
        satz: 'Passt Ihnen der Techniker eher Donnerstag oder Montag?',
      },
      {
        art: 'oTon',
        wann: 'G3 Bedingter Abschluss',
        satz: 'Wenn ich Ihnen [Closer] ermöglichen kann – sind wir dann im Geschäft?',
      },
      {
        art: 'oTon',
        wann: 'G8 Rückfrage zur Bestätigung',
        satz: 'Habe ich das richtig verstanden: Ihnen geht es vor allem um [Kernpunkt]?',
      },
    ],
  },
  {
    nr: 9,
    titel: 'Zusammenfassung mit positivem Ausklang',
    kurz: 'Ausklang',
    moment: 'gespraech',
    bloecke: [
      {
        art: 'text',
        titel: 'Kevins Vorgehen',
        text: 'Das Gespräch endet mit einer letzten Schleife, damit der Kunde mit einem positiven Gefühl rausgeht – nicht mit einem trockenen „wird erledigt“.',
      },
      {
        art: 'schritte',
        titel: 'Aufbau',
        punkte: [
          'Gemeinsamkeit betonen',
          'Zusammenfassen, was jetzt konkret passiert – Gutschein, Kündigungsrücknahme, Weiterleitung an Technik',
          'Verbindliche Zeitangabe geben, wann man sich zurückmeldet – kein „irgendwann“, sondern ein festes Zeitfenster',
        ],
      },
      {
        art: 'oTon',
        wann: 'Gemeinsamkeit betonen',
        satz: 'Gut, finde ich gut, dass wir gemeinsam eine Lösung gefunden haben.',
      },
      {
        art: 'text',
        text: 'Der letzte Punkt macht das Versprechen überprüfbar für den Kunden – und diszipliniert einen selbst zum tatsächlichen Nachfassen.',
      },
    ],
  },
  {
    nr: 10,
    titel: 'Nachbereitung',
    zusatz: 'aktueller Stand: keine',
    kurz: 'Nachbereitung',
    moment: 'danach',
    bloecke: [
      {
        art: 'text',
        titel: 'Kevins Praxis aktuell',
        text: 'Keine systematische Doku nach dem Gespräch.',
      },
      {
        art: 'text',
        titel: 'Randnotiz',
        text: 'Ohne Dokumentation, welcher Closer gezogen wurde und ob er wirkt, lässt sich später nicht auswerten, was tatsächlich funktioniert – auch die geplante Wirtschaftlichkeits-Anzeige im CRM braucht genau diese Daten als Basis. Keine Handlungsaufforderung an dieser Stelle, nur als Erinnerung für später stehen gelassen.',
      },
    ],
  },
]

/** Die fünf Einwände aus Phase 7. Sie stehen nur hier und werden zweimal gezeigt. */
const EINWAENDE: readonly Einwand[] = [
  {
    einwand: 'Ich schau mich erstmal um.',
    antwort:
      'Machen Sie das. Achten Sie beim Wettbewerber auf den Preis ab Monat 13 – da wird es meistens teuer.',
  },
  {
    einwand: 'Woanders ist es billiger.',
    antwort: 'Für die ersten 12 Monate oft ja. Rechnen wir über die volle Laufzeit?',
  },
  {
    einwand: 'Ich habe schon gekündigt.',
    antwort: 'Die Kündigung lässt sich zurücknehmen. Was war der Auslöser?',
  },
  {
    einwand: 'Ich hatte schon mal Ärger mit Ihnen.',
    antwort: 'Das kann ich nachvollziehen. Was genau war los?',
    // Wortlaut des Dokuments. W13/W14/W15 kommen mit Doc 02 dazu.
    hinweis: 'danach zurück zu W13/W14/W15',
  },
  {
    einwand: 'Zu teuer.',
    antwort: 'Im Vergleich wozu genau?',
  },
]

/** Gelten in jeder Phase – stehen deshalb dauerhaft in der Fußzeile. */
const LEITPLANKEN: readonly Leitplanke[] = [
  {
    regel: 'Keine erfundene Dringlichkeit.',
    grund: 'Genau das zerlegen die Foren bei Telekom und Vodafone.',
  },
  {
    regel: 'Sachwert vor Rabatt.',
    grund: 'Erst Stufe 1, dann erst bei Bedarf weiter eskalieren.',
  },
  {
    regel: 'Rabatt heilt keinen Service-Grund.',
    grund: 'Bei Service-Kündigern nie mit Preis-Closern starten.',
  },
  {
    regel: 'Ehrlichkeit bei Fristen.',
    grund: 'Nur mit einer Frist arbeiten, wenn sie echt ist.',
  },
]

export const LEITFADEN = {
  id: 'winback-universal',
  titel: 'Winback · Universal',
  einsatz: 'Outbound nach Kündigungseingang',
  stand: 'Erster Entwurf – Universalgerüst, wird je Kündigertyp verfeinert',
  phasen: PHASEN,
  einwaende: EINWAENDE,
  leitplanken: LEITPLANKEN,
  /** Abschnitt „Offen für die Weiterentwicklung“ des Dokuments. */
  weiterentwicklung: [
    'Eigene Varianten je Kündigertyp, mit vollständig ausformulierten Sätzen für Phase 3 bis 5',
    'Variante für VVL (vor der Kündigung) und für die Inbound-Situation',
    'Einbau der Eskalationsstufen aus Doc 05 als konkrete Euro-Pakete direkt im Skript',
    'Rollenspiel-Test mit echten Einwänden aus der Praxis',
  ],
} as const

/** Die Phase, mit der ein Gespräch beginnt. Phase 0 läuft vor dem Anruf. */
export const ERSTE_GESPRAECHSPHASE = 1
