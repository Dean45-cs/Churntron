# Churntron

Internes Vertriebs-Tool der TNG mit vier Modulen: **Churn-Leitfaden**,
**Einwand-Wiki**, **Provisionen** und **Challenges**.

Aktueller Stand: **Grundgerüst (Stage 1)** steht, das **Provisionsmodul (Stage 4)**
ist ausgebaut (selbst tracken per Tastendruck, Verdienst-Auswertung von der Stunde bis
zum Jahr, Brutto-Netto-Rechner und der Abgleich mit der tatsächlichen Auszahlung), und
die **Einwand-Wiki (Stage 6)** sammelt Einwandbehandlungen mit einer Suche, die im
Gespräch mithält. Import (Stage 2), Churn-Modul (Stage 3) und Challenges (Stage 5)
folgen – siehe [PLAN.md](./PLAN.md).

Online stellen: [DEPLOY.md](./DEPLOY.md).

---

## Lokal starten

Du brauchst **Node 22 oder neuer** und eine **PostgreSQL-Datenbank**. Die Datenbank ist
der einzige Teil, der etwas Vorbereitung braucht – such dir unten den Weg aus, der zu
deinem Rechner passt.

### Schritt 1: Datenbank besorgen

**Weg A – Docker (empfohlen, wenn Docker Desktop läuft)**

Ein Befehl, nichts einzurichten. Die Zugangsdaten passen bereits zur `.env.example`:

```bash
npm run db:up
```

**Weg B – Cloud-Datenbank (wenn du nichts installieren darfst)**

Auf einem Firmenlaptop ohne Adminrechte der einfachste Weg. Kostenlos bei
[neon.com](https://neon.com): Projekt anlegen, als Region **Frankfurt (eu-central-1)**
wählen, Connection-String kopieren. Den trägst du gleich in Schritt 2 als `DATABASE_URL`
ein.

**Weg C – PostgreSQL ist installiert**

Einmalig Benutzer und Datenbank anlegen, dann passt die vorgegebene `DATABASE_URL`:

```bash
psql -U postgres -c "CREATE USER churntron WITH PASSWORD 'churntron' CREATEDB;"
psql -U postgres -c "CREATE DATABASE churntron OWNER churntron;"
```

### Schritt 2: Projekt starten

```bash
cp .env.example .env    # bei Weg B: DATABASE_URL durch deinen Neon-String ersetzen
npm install
npm run db:migrate      # legt die Tabellen an
npm run db:seed         # füllt synthetische Demo-Daten ein
npm run dev             # http://localhost:3000
```

### Demo-Konten

| E-Mail         | Rolle                   |
| -------------- | ----------------------- |
| `rep@tng.de`   | Vertrieb                |
| `admin@tng.de` | Ausbilder / Teamleitung |

Passwort für beide: der Wert von `DEMO_PASSWORD` aus der `.env` (Standard: `churntron`).
Als Admin sind zusätzlich die Team-Übersicht bei den Provisionen und der
Verwaltungsbereich in der Navigation sichtbar.

---

## Das Provisionsmodul

Fünf Reiter unter **Provisionen**:

| Reiter             | Wofür                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tracker**        | Ein Tastendruck ist eine Buchung. Zähler je Taste, optionale Vertragsnummer, Rückgängig-Taste.                                                              |
| **Verdienst**      | Summen für heute, Woche, Monat, Quartal und Jahr; Schnitt pro Stunde, Arbeitstag, Buchungstag, Kalendertag, Woche, Monat, Quartal, Jahr – brutto und netto. |
| **Brutto / Netto** | Was von der Provision übrig bleibt, gerechnet als Aufschlag aufs Grundgehalt. Die eigenen Angaben bleiben gespeichert.                                      |
| **Abgleich**       | Eingeben, was ausgezahlt wurde, und gegen die eigenen Buchungen halten.                                                                                     |
| **Katalog**        | Alle Sätze aus dem Provisionskatalog zum Nachschlagen, samt Voraussetzungen.                                                                                |

### Abrechnungsperioden: 20. bis 20.

Eine Periode läuft vom **20. eines Monats bis zum 19. des Folgemonats** und wird
**eine Abrechnung später** ausgezahlt. Die Periode „September 2026" umfasst also
20.08.–19.09.2026 und wird am 20.10.2026 gezahlt.

Beide Zahlen stehen als Konstante in `src/lib/period.ts` (`STICHTAG`,
`AUSZAHLUNG_VERZUG_MONATE`). Nennt die Lohnbuchhaltung einen anderen Stichtag oder
einen anderen Verzug, ist das eine Zeile.

### Die Sätze ändern

Der Katalog steht in `src/lib/commission-catalog.ts` und wird bei jedem
`npm run db:seed` per Upsert in die Datenbank geschrieben – auch dann, wenn die
Demo-Daten stehen bleiben sollen. Der Schlüssel (`key`) eines Eintrags ist stabil:
an ihm hängen die bereits gebuchten Positionen, er darf sich nicht ändern, wenn ein
Produkt umbenannt wird.

> **Der Brutto-Netto-Rechner ist eine Schätzung, keine Lohnabrechnung.** Nachgebildet
> sind Einkommensteuertarif (§ 32a EStG), Vorsorgepauschale, Soli, Kirchensteuer und
> die vier Sozialversicherungszweige mit ihren Beitragsbemessungsgrenzen. Nicht
> nachgebildet sind individuelle Freibeträge aus den ELStAM, Sachbezüge,
> Einmalzahlungen als sonstiger Bezug, betriebliche Altersvorsorge und der
> Sachsen-Zuschlag zur Pflegeversicherung. Die Rechenwerte je Jahr stehen als eine
> Tabelle in `src/lib/brutto-netto.ts` und werden einmal jährlich nachgezogen.

---

## Die Einwand-Wiki

Gesammelte Einwandbehandlungen – auffindbar, während das Telefonat läuft. Ein Eintrag
besteht aus dem Einwand im Wortlaut des Kunden, anderen Formulierungen desselben
Einwands, der Antwort und der Rückfrage, die das Gespräch weiterträgt.

### Wie ein Eintrag im Gespräch aussieht

Im Call wird nicht gelesen, sondern gesprochen. Deshalb steht eine Einwandbehandlung
nicht als Absatz da, sondern als drei Schritte:

| Schritt             | Was dort steht                                  |
| ------------------- | ----------------------------------------------- |
| **Jetzt sagen**     | Der Einstiegssatz, wörtlich – die erste Zeile   |
| **Das zählt**       | Ein Gedanke pro Zeile, als Punkte untereinander |
| **Und dann fragen** | Die Rückfrage, die das Gespräch zurückgibt      |

Die Form kommt beim Schreiben: **erste Zeile = Einstiegssatz, danach ein Gedanke pro
Zeile.** Zugeklappt zeigt eine Karte genau diesen Einstiegssatz – beim Überfliegen der
Trefferliste sieht man also, was man sagen würde, nicht den Anfang eines Absatzes.

Erfunden wird dabei nichts: Wer einen langen Absatz eintippt, bekommt einen Absatz
angezeigt (`zerlegeAntwort` in `src/lib/objection-text.ts`). Struktur, die niemand
gemeint hat, wäre im Gespräch schlimmer als gar keine.

### Die Suche

Getippt wird, was der Kunde gerade gesagt hat. „zu teuer" findet deshalb nicht nur den
gleichnamigen Eintrag, sondern auch Preiserhöhung, Rabattforderung und
„woanders günstiger". Vier Schichten, alle in `src/lib/objection-search.ts`:

1. **Normalisieren** – Kleinschreibung, Umlaute ausgeschrieben (`ä` → `ae`). Im
   Gespräch tippt niemand Umlaute.
2. **Stammformen** – „kündigen", „Kündigung" und „gekündigt" landen auf demselben Stamm.
3. **Themen** – ein Katalog von Wortfeldern: „teuer", „Kosten", „Budget" und „Rabatt"
   gehören zum Thema Preis. Fehlt ein Wort, das im Team oft fällt, ist das **eine Zeile**
   in `THEMEN` – kein Code.
4. **Tippfehler** – Levenshtein-Abstand 1 bis 2, je nach Wortlänge. „Kündigng" trifft noch.

Die Liste ist zweigeteilt: Oben steht, was den Einwand selbst trifft (Überschrift,
Formulierung, Schlagwort, Thema), unter **Vielleicht auch passend** das, was nur im
Antworttext vorkommt.

Gesucht wird im Browser, ohne Netzrunde – der Bestand kommt einmal vom Server. Das
trägt bis in den niedrigen dreistelligen Bereich an Einträgen; darüber wandert dieselbe
Bewertung in eine Server Action oder in die Volltextsuche von Postgres.

### Pflegen

Anlegen, überarbeiten und archivieren geht in der Oberfläche, ohne Umweg über einen
Admin. Gelöscht wird nichts: ein überholter Eintrag wandert ins Archiv und bleibt
über den Archiv-Filter erreichbar. „Hat geholfen" ist kein Gefällt-mir, sondern die
Sortierung – was im Gespräch getragen hat, steht bei gleich gutem Treffer oben.

Der Startbestand steht in `src/lib/objection-catalog.ts`. Anders als beim
Provisionskatalog gilt hier: **Sobald jemand einen Eintrag überarbeitet, gehört er dem
Team.** Der Seed legt fehlende Einträge an und frischt einen Starteintrag nur auf,
solange ihn niemand angefasst hat – so kommt eine verbesserte Formulierung auch in eine
Datenbank, die schon läuft, ohne je eine Änderung aus der Oberfläche zu überschreiben.
„Hat geholfen" und Archivieren zählen nicht als Anfassen.

> **Auch hier gilt: keine Klardaten.** In der Wiki steht, _was_ Kundinnen und Kunden
> sagen – nie, wer es gesagt hat. Vertragsnummern, Kundennummern, Telefonnummern und
> E-Mail-Adressen werden beim Speichern abgewiesen (`src/lib/objection-input.ts`).

### Skeletons anschauen

```bash
npm run dev:skeletons
```

Setzt `SKELETON_DEMO=1` und verzögert die Abfragen künstlich. Ohne das antwortet die
Datenbank in wenigen Millisekunden – man sieht die Ladezustände sonst nie. Solange die
Variable gesetzt ist, steht ein Hinweis „Demo · erfundene Daten" in der Topbar.

---

## Wenn etwas nicht klappt

**Schnellster Weg: `/api/health` aufrufen** (lokal `http://localhost:3000/api/health`).
Die Route sagt, welche Umgebungsvariablen gesetzt sind und ob die Datenbank antwortet —
ausschließlich als Ja/Nein, nie die Werte selbst.

**`Environment variable not found: DATABASE_URL`**
Die `.env` fehlt oder ist leer. `cp .env.example .env` – und bei Weg B den
Neon-String eintragen.

**`ECONNREFUSED 127.0.0.1:5432`**
Die Datenbank läuft nicht. Bei Weg A: `npm run db:up`. Bei Weg C: den
PostgreSQL-Dienst starten. Prüfen lässt es sich mit `pg_isready`.

**`port is already allocated` beim `npm run db:up`**
Auf Port 5432 läuft schon ein PostgreSQL. Entweder das benutzen (Weg C) oder in
`docker-compose.yml` auf `'5433:5432'` ändern und in der `.env` die Portnummer mitziehen.

**Der Login sagt „E-Mail oder Passwort stimmt nicht"**
Der Seed lief noch nicht durch: `npm run db:seed`.

---

## Datenschutz

**In der Datenbank stehen keine Klardaten von Kundinnen und Kunden.** Kein Name,
keine Adresse, keine Telefonnummer, keine E-Mail. Der Bezug läuft ausschließlich
über die Vertrags- bzw. Kundennummer (`Contract.externalRef`).

Die Einwand-Wiki ist die einzige Stelle, an der Freitext von Hand in die Datenbank
kommt. Deshalb wird dort beim Speichern geprüft: Ziffernfolgen ab sechs Stellen und
E-Mail-Adressen werden abgewiesen, mitsamt einem Satz, der erklärt, warum.

Die Klardaten bleiben im bestehenden Kampagnen-Lookup, das offline auf dem Rechner
läuft. Dessen Reporting-CSV ist die vorgesehene Schnittstelle nach Churntron –
sie enthält bereits keine Adresse und keine E-Mail; Name und Rufnummer werden beim
Import verworfen.

Ein Test (`npm test`) prüft das Prisma-Schema gegen diese Zusage.

> Einordnung: Vertrags- und Kundennummern sind _pseudonyme_ personenbezogene Daten,
> keine anonymen. Der Ansatz senkt das Risiko deutlich, macht das Tool aber nicht
> DSGVO-frei. Wichtiger noch: Provisionen und Leaderboard sind **Mitarbeiter**-Leistungsdaten
> und damit nach § 87 BetrVG mitbestimmungspflichtig. Bevor echte Zahlen produktiv laufen,
> müssen TNG-IT, Datenschutzbeauftragte und Betriebsrat eingebunden werden – unabhängig
> davon, wo gehostet wird.

Die Schriften lädt `next/font/google` beim Bauen herunter und liefert sie von der eigenen
Domain aus. Der Browser der Besucher spricht nie mit Google – der bekannte Stolperstein
aus dem Google-Fonts-Urteil ist damit von Haus aus umgangen.

---

## Befehle

| Befehl                  | Zweck                                        |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Entwicklungsserver                           |
| `npm run dev:skeletons` | Entwicklungsserver mit sichtbaren Skeletons  |
| `npm run build`         | Produktions-Build inkl. Typprüfung           |
| `npm run lint`          | ESLint                                       |
| `npm test`              | Vitest                                       |
| `npm run format`        | Prettier                                     |
| `npm run db:up`         | Datenbank per Docker starten                 |
| `npm run db:down`       | Datenbank anhalten                           |
| `npm run db:migrate`    | Prisma-Migration                             |
| `npm run db:seed`       | Demo-Daten neu erzeugen (setzt alles zurück) |
| `npm run db:studio`     | Prisma Studio                                |

## Technik

Next.js 16 (App Router) · TypeScript strict · Tailwind 4 · Prisma 7 mit PostgreSQL ·
NextAuth v5 (Credentials) · Vitest.

Projektkonventionen stehen in [AGENTS.md](./AGENTS.md).

### Bekannte Meldung aus `npm audit`

`npm audit` meldet zwei Schwachstellen in `mysql2` und `deepmerge-ts`. Beide kommen aus
dem Abhängigkeitsbaum von Prisma 7 und lassen sich nur durch ein Downgrade auf Prisma 6
„beheben". Keine von beiden greift hier: `mysql2` wird nie geladen, weil wir über
`@prisma/adapter-pg` mit PostgreSQL sprechen, und `deepmerge-ts` verarbeitet beim
Aufruf des Prisma-CLI ausschließlich unsere eigene `prisma.config.ts`. Wir bleiben
deshalb auf Prisma 7 und beobachten die Aktualisierungen.
