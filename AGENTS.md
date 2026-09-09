# Churntron – Projektkonventionen

Internes Vertriebs-Tool der TNG. Vier Module: Churn-Leitfaden, Einwand-Wiki,
Provisionen, Challenges. Das Grundgerüst (Stage 1) steht, das Provisionsmodul (Stage 4)
ist ausgebaut, die Einwand-Wiki (Stage 6) läuft und Konten samt Profilen (Stage 7)
stehen. Import, Churn-Fachlogik und Challenges folgen (siehe `PLAN.md`).

## Die eine Regel, die nicht verhandelbar ist

**In der Datenbank stehen keine Klardaten von Kundinnen und Kunden.**
Kein Name, keine Adresse, keine Telefonnummer, keine E-Mail – auch nicht als Testdaten.
Der Bezug zum Kunden läuft ausschließlich über `Contract.externalRef`
(Vertrags- bzw. Kundennummer). Die Klardaten bleiben im lokalen Kampagnen-Lookup,
das offline auf dem Rechner der Vertriebler läuft.

`src/lib/__tests__/schema-privacy.test.ts` prüft das gegen `prisma/schema.prisma`.
Wenn der Test rot wird, ist das kein Formfehler – dann wurde die Zusage gebrochen.

Die Einwand-Wiki ist die einzige Stelle, an der jemand Freitext über einen Kunden
eintippt. Dort greift zusätzlich `enthaeltKundendaten` in `src/lib/objection-input.ts`:
Ziffernfolgen ab sechs Stellen und E-Mail-Adressen kommen nicht in die Datenbank. Wer
dort ein Feld ergänzt, nimmt es in die Prüfschleife mit auf.

**Von den eigenen Leuten steht auch nur das Nötige drin.** Seit es Profile gibt,
prüft derselbe Test das Modell `User` mit: keine Privatanschrift, keine Rufnummer,
kein Geburtsdatum, keine IBAN – und **kein Anmeldeverlauf**. Gespeichert wird der
Zeitpunkt der letzten Anmeldung (`lastLoginAt`), damit Admins tote Konten finden,
und sonst nichts. Provisionen und Leaderboard sind schon jetzt
mitbestimmungspflichtige Leistungsdaten; eine Anwesenheitsliste kommt nicht dazu.

## Ordnerstruktur

```
src/
  app/
    (dashboard)/        Route-Gruppe mit Auth-Guard, Sidebar und Topbar
      dashboard/        Übersicht + die vier Module, je mit loading.tsx
        konto/            eigenes Profil, Anzeige, Passwort
        verwaltung/       nur für ADMIN: Nutzerverwaltung
    login/              Anmeldung (Server Action)
    api/auth/           NextAuth-Handler
    api/avatar/         liefert Profilbilder aus (nur angemeldet)
  components/
    ui/                 Primitive: Card, Button, Badge, Skeleton, Progress
    skeletons/          Ladezustände – je ein Baustein pro wiederkehrendem Block
    layout/             Sidebar, Topbar, Theme-Umschalter, Auto-Refresh
    avatar.tsx          Profilbild mit Initialen-Rückfall
  lib/
    db.ts               Prisma-Client (Driver-Adapter, Prisma 7)
    auth.ts             NextAuth mit Credentials-Provider
    auth.config.ts      edge-sicherer Teil für die Middleware
    session.ts          angemeldeter Nutzer – frisch aus der DB, nicht aus dem JWT
    actions.ts          ActionErgebnis, die Antwortform aller Server Actions
    profil.ts           Regeln fürs eigene Konto (Namen, Passwort, Takt)
    avatar.ts           was als Profilbild hereindarf – Prüfung ohne Datenbank
    queries/            ALLE Datenabfragen der Seiten
      index.ts            Konto, Verwaltung, Übersicht, Churn, Challenges – und:
      commissions.ts      das Provisionsmodul (eigene Datei wegen des Umfangs)
      objections.ts       die Einwand-Wiki
    commission-catalog.ts Provisionskatalog als Daten – Quelle für den Seed
    objection-catalog.ts  Startbestand der Einwand-Wiki – Quelle für den Seed
    objection-search.ts   die Suche der Wiki: Stammformen, Wortfelder, Tippfehler
    objection-text.ts     Einstiegssatz und Punkte – wie ein Eintrag im Call gelesen wird
    objection-input.ts    Prüfung der Wiki-Eingaben, inklusive Datenschutz-Sperre
    period.ts           Abrechnungsperioden 20. bis 20.
    zeitraum.ts         Kalendermonat und Abrechnungszeitraum unter einer Schnittstelle
    time.ts             Tages-, Wochen- und Monatsgrenzen in Europe/Berlin
    earnings.ts         Verdienst-Auswertung (reine Rechnung, ohne Datenbank)
    brutto-netto.ts     Lohnsteuer, Soli, Sozialabgaben – reine Rechnung
    labels.ts           deutsche Beschriftungen der Enum-Werte
    utils.ts            cn, formatEuro, formatDate, initials, Eingabe-Parser
    dev.ts              devDelay für die Skeleton-Demo
```

Seiten importieren weiterhin aus `@/lib/queries` – die Aufteilung in zwei Dateien
sieht man von außen nicht.

## Server und Client

- **Datenabruf gehört in Server Components**, und zwar über `src/lib/queries.ts`.
  Seiten reden nicht direkt mit Prisma – dort greift später das `DataSource`-Interface,
  wenn die Daten aus Dynamics statt aus dem Excel-Import kommen.
- **Zeitbezüge (`Date.now()`, `new Date()`) gehören nicht in den Render-Pfad.**
  Sie stehen in `queries.ts`; die Komponente bekommt fertige Werte
  (z. B. `ueberfaellig: boolean` statt eines Zeitstempels zum Vergleichen).
  Der Lint-Regelsatz `react-hooks/purity` setzt das durch.
- **`'use client'` nur für echte Interaktivität** (Theme-Umschalter, Formular-State).
  Kein `asChild`/Slot-Muster: für Links die Variantenklassen direkt setzen,
  `<Link className={buttonVariants({ variant: 'ghost' })}>`. Das spart eine
  Client-Grenze – ein Slot-Wrapper hat hier schon einmal einen Hydration-Fehler erzeugt.

## Skeleton-Loading

Überall, wo geladen wird, steht ein Skeleton. Zwei Ebenen:

1. **`loading.tsx` je Route-Segment** – greift beim Navigieren, bevor überhaupt eine
   Server-Component läuft.
2. **`<Suspense>` um jede datenabrufende Einheit** – der Seitenkopf steht sofort,
   einzelne Karten laden für sich nach. Nie die ganze Seite auf die langsamste Abfrage warten lassen.

**Ein Skeleton bildet die Form des echten Inhalts nach** – gleiche Höhe, gleiche Breite,
gleiche Abstände. Deshalb gibt es unter `components/skeletons/` je einen Baustein pro
Block und keinen generischen grauen Kasten. Wenn du eine Komponente mit fester Höhe
änderst (z. B. `StatCard` mit `h-[116px]`), zieh das Skeleton mit.

Zum Anschauen: `npm run dev:skeletons` – setzt `SKELETON_DEMO=1` und verzögert die
Abfragen künstlich. Ohne das antwortet der lokale Postgres zu schnell, um etwas zu sehen.

`devDelay()` hängt allein an `SKELETON_DEMO`, **auch in Produktion** – die öffentliche
Demo soll genau diese Ladezustände zeigen. Damit die Bremse nicht für echtes Verhalten
gehalten wird, trägt die Topbar dann den Hinweis „Demo · erfundene Daten". In einer
produktiven Umgebung mit echten Daten wird die Variable nicht gesetzt (siehe `DEPLOY.md`).

## Provisionen

Drei Dinge sind hier nicht verhandelbar:

1. **Der Betrag kommt aus dem Katalog, nie aus dem Formular.** Die Server Action
   schlägt die Regel über ihren `key` nach und nimmt deren `amountCents`. Was eine
   Leistung wert ist, entscheidet die Preisliste – nicht der Browser.
2. **Eine Periode läuft vom 20. bis zum 20.** Der Stichtag und der Auszahlungsverzug
   stehen als Konstante in `src/lib/period.ts` und sonst nirgends. `periodMonth` einer
   Buchung wird immer aus `occurredAt` über `periodeVon()` abgeleitet.

   Der Kalendermonat bleibt daneben stehen. Dieselben Buchungen ergeben zwei
   verschiedene Zahlen – „was habe ich im September gemacht" ist eine andere Frage
   als „was steht auf der nächsten Abrechnung", und beide werden gestellt. Deshalb
   zeigt jede Ansicht **beide Zuschnitte**, jeder mit seiner Spanne darunter, nie
   eine allein und nie eine unbeschriftete Zahl namens „Monat". Beide laufen über
   `src/lib/zeitraum.ts` (`art: 'monat' | 'periode'`); die Karte dafür ist
   `components/zeitraum-vergleich.tsx`.

3. **Tages- und Wochengrenzen laufen über `src/lib/time.ts`, nie über die Serverzeit.**
   Der Server läuft in UTC, gearbeitet wird in Deutschland. Eine Buchung um 00:30 Uhr
   würde sonst auf den Vortag rutschen – und „was habe ich heute verdient" ist genau
   die Frage, um die es geht. Auch `formatDate` trägt deshalb `timeZone: 'Europe/Berlin'`.

Beträge stehen überall in **Cent** und werden erst zur Anzeige über `formatEuro`
umgerechnet – mit zwei Nachkommastellen, weil der Katalog Sätze wie 6,50 € und 1,00 €
kennt. Bei 137 Vorgängen macht das Runden auf ganze Euro sonst mehrere Euro Unterschied,
und genau diese Summe muss beim Abgleich stimmen.

Der Brutto-Netto-Rechner ist eine **Schätzung**. Seine Rechenwerte stehen als eine
Tabelle je Steuerjahr in `src/lib/brutto-netto.ts`; einmal im Jahr ändert der
Gesetzgeber sie, und dann soll genau ein Block angefasst werden müssen. Die Tests
prüfen ihn über seine Eigenschaften – Stetigkeit an den Zonengrenzen, Monotonie,
Deckelung an den Beitragsbemessungsgrenzen –, nicht auf den Cent gegen eine
Lohnabrechnung.

## Einwand-Wiki

Drei Dinge tragen das Modul:

1. **Die Suche läuft im Browser.** Gesucht wird während eines Telefonats – zwischen
   Tastendruck und Treffer darf keine Netzrunde liegen. Der Bestand kommt einmal vom
   Server, bewertet wird in `src/lib/objection-search.ts`, einer reinen Rechnung ohne
   Datenbank. Ab ein paar hundert Einträgen wandert dieselbe Funktion in eine Server
   Action oder in die Volltextsuche von Postgres; die Bewertung bleibt dieselbe.
2. **Die Wortfelder sind Daten, kein Code.** Dass „zu teuer" auch die Einträge zu
   Preiserhöhung und Rabatt findet, steht als Liste in `THEMEN`. Fehlt ein Wort, das im
   Gespräch oft fällt, ist das eine Zeile – keine Fachlogik.
3. **Ein Eintrag hat eine Form, und die kommt vom Autor.** Erste Zeile: der Satz, mit
   dem es weitergeht. Danach ein Gedanke pro Zeile. Die Karte macht daraus drei
   Schritte – _Jetzt sagen · Das zählt · Und dann fragen_ –, weil im Gespräch nicht
   gelesen, sondern gesprochen wird. `zerlegeAntwort` in `src/lib/objection-text.ts`
   erfindet dabei nichts: Wer einen Absatz eintippt, bekommt einen Absatz angezeigt.
   Struktur, die niemand gemeint hat, wäre schlimmer als gar keine.
4. **Der Startbestand gehört dem Team, sobald es ihn anfasst.** Der Provisionskatalog
   ist eine Preisliste und wird bei jedem Seed überschrieben; die Wiki nicht. Der Seed
   legt fehlende Einträge an (erkennbar am `key`) und frischt einen Starteintrag nur
   auf, solange `edited` false ist. Die Server Action `einwandAendern` setzt das Flag –
   ab dann bleibt die Fassung des Teams stehen, auch wenn der Katalog sich
   weiterentwickelt. „Hat geholfen" und Archivieren zählen nicht als Anfassen. Selbst
   angelegte Einträge haben keinen `key` und werden nie angerührt.

Gelöscht wird nichts: `archived` blendet einen Eintrag aus der Suche aus, das Archiv
holt ihn zurück. Und `helpful` ist kein Gefällt-mir, sondern die Sortierung bei gleich
gutem Treffer.

## Konten, Profile und die stille Aktualisierung

Vier Dinge sind hier nicht verhandelbar:

1. **Im Sitzungstoken steht nur die ID.** Alles Veränderliche – Name, Rolle, Team,
   Profilbild – kommt bei jeder Anfrage frisch aus der Datenbank, über
   `aktuellerNutzer()` in `src/lib/session.ts`. Ein JWT wird beim Anmelden
   geschrieben und danach nie wieder angefasst: wer seinen Namen ändert, sähe ihn
   sonst bis zum nächsten Anmelden nicht, und ein deaktiviertes Konto könnte
   weiterarbeiten, bis das Token abläuft. `cache()` aus React fasst die Aufrufe
   einer Anfrage zusammen, es bleibt also bei einer Abfrage.
2. **Jede Server Action prüft selbst.** `angemeldeterNutzer()` für eigene Daten,
   `angemeldeterAdmin()` für die Verwaltung – und beide fragen die Datenbank, nicht
   das Token. Actions sind über einen direkten POST erreichbar, nicht nur über die
   eigene Oberfläche.
3. **Was als Profilbild hereinkommt, bestimmen die Magic Bytes.** Nicht der Typ, den
   der Browser behauptet – unter genau diesem Typ liefern wir die Datei ja wieder
   aus. SVG ist ausgeschlossen: es darf Skripte tragen. Zugeschnitten und
   verkleinert wird im Browser (256×256, rund 30 KB), gespeichert wird in
   `UserAvatar` als BYTEA. Kein zusätzlicher Speicherdienst – das wäre ein weiterer
   Anbieter samt Auftragsverarbeitung für 30 Bilder.
4. **Konten werden deaktiviert, nicht gelöscht.** An den Buchungen hängt die
   Abrechnung. `User.active` steuert Anmeldung _und_ laufende Sitzungen.

Die Oberfläche hält sich über `router.refresh()` selbst aktuell
(`src/components/layout/auto-refresh.tsx`) – im Takt, den der Nutzer im Konto
einstellt, „aus" eingeschlossen, und nur solange das Fenster im Vordergrund ist.
Bewusst kein Push über SSE oder WebSockets: dafür bräuchte es einen Vermittler
zwischen den Server-Instanzen, auf Vercel also einen weiteren Dienst. Solange die
Hosting-Frage offen ist (`PLAN.md`, offener Punkt 8), ist Nachfragen im Takt die
ehrlichere Antwort.

## Design

TNG-Farbwelt: Navy `#00336E` trägt Navigation und Primäraktionen, Orange `#F18700`
ist **ausschließlich** für Highlights und CTAs reserviert – nie flächig.
Schrift: Archivo (Text), IBM Plex Mono (Vertragsnummern, Kennzahlen – dort zählt
gleiche Ziffernbreite, dafür gibt es die Klasse `tabular`).

Alle Farben sind Tokens in `src/app/globals.css`, hell und dunkel. **Keine
Hex-Werte in Komponenten.** Im Dunkelmodus ist die Primärfarbe aufgehellt
(`#6BA4DE`), weil reines Navy dort zu wenig Kontrast hat.

Karten: `rounded-2xl`, weiche Schatten statt harter Rahmen, viel Weißraum.

## Datenbank

Prisma 7 mit Driver-Adapter: die Connection-URL steht in `prisma.config.ts`,
nicht im Schema. Der Client wird in `src/lib/db.ts` mit `PrismaPg` gebaut.

```bash
npm run db:migrate   # Migration anlegen und anwenden
npm run db:seed      # synthetische Demo-Daten (löscht vorher alles)
npm run db:studio    # Daten anschauen
```

Der Seed enthält **nur erfundene Daten**. Keine echten Listen ins Repo.

## Vor jedem Commit

```bash
npm run lint && npm test && npm run build
```

Bei Änderungen an den Provisionsseiten zusätzlich die Sichtprüfung:

```bash
npm run dev:skeletons                          # in einem zweiten Terminal
SHOT_DIR=./screenshots node scripts/screenshots.mjs
```
