# Churntron

Internes Vertriebs-Tool der TNG mit drei Modulen: **Churn-Leitfaden**,
**Provisionen** und **Challenges**.

Aktueller Stand: **Grundgerüst (Stage 1)** – Layout, Design, Datenmodell, Anmeldung und
alle vier Seiten stehen und sind mit synthetischen Daten befüllt. Die Fachlogik der
Module folgt in Stage 2–5, siehe [PLAN.md](./PLAN.md).

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

### Skeletons anschauen

```bash
npm run dev:skeletons
```

Setzt `SKELETON_DEMO=1` und verzögert die Abfragen künstlich. Ohne das antwortet die
Datenbank in wenigen Millisekunden – man sieht die Ladezustände sonst nie. Solange die
Variable gesetzt ist, steht ein Hinweis „Demo · erfundene Daten" in der Topbar.

---

## Wenn etwas nicht klappt

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

| Befehl                  | Zweck                                       |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Entwicklungsserver                          |
| `npm run dev:skeletons` | Entwicklungsserver mit sichtbaren Skeletons |
| `npm run build`         | Produktions-Build inkl. Typprüfung          |
| `npm run lint`          | ESLint                                      |
| `npm test`              | Vitest                                      |
| `npm run format`        | Prettier                                    |
| `npm run db:up`         | Datenbank per Docker starten                |
| `npm run db:down`       | Datenbank anhalten                          |
| `npm run db:migrate`    | Prisma-Migration                            |
| `npm run db:seed`       | Demo-Daten neu erzeugen                     |
| `npm run db:studio`     | Prisma Studio                               |

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
