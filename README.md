# Churntron

Internes Vertriebs-Tool der TNG mit drei Modulen: **Churn-Leitfaden**,
**Provisionen** und **Challenges**.

Aktueller Stand: **Grundgerüst (Stage 1)** – Layout, Design, Datenmodell, Anmeldung und
alle vier Seiten stehen und sind mit synthetischen Daten befüllt. Die Fachlogik der
Module folgt in Stage 2–5, siehe [PLAN.md](./PLAN.md).

## Schnellstart

Voraussetzung: Node 22+, ein erreichbarer PostgreSQL.

```bash
npm install
cp .env.example .env          # DATABASE_URL und AUTH_SECRET eintragen
npm run db:migrate            # Schema anlegen
npm run db:seed               # synthetische Demo-Daten
npm run dev                   # http://localhost:3000
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

Setzt `SKELETON_DEMO=1` und verzögert die Abfragen künstlich. Ohne das antwortet
die lokale Datenbank in wenigen Millisekunden – man sieht die Ladezustände sonst nie.

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
> DSGVO-frei. Vor einem breiten Rollout sollte die TNG-IT einmal draufschauen –
> besonders wegen Leaderboard und Challenges, das ist formal Leistungsauswertung.

## Befehle

| Befehl                  | Zweck                                       |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Entwicklungsserver                          |
| `npm run dev:skeletons` | Entwicklungsserver mit sichtbaren Skeletons |
| `npm run build`         | Produktions-Build inkl. Typprüfung          |
| `npm run lint`          | ESLint                                      |
| `npm test`              | Vitest                                      |
| `npm run format`        | Prettier                                    |
| `npm run db:migrate`    | Prisma-Migration                            |
| `npm run db:seed`       | Demo-Daten neu erzeugen                     |
| `npm run db:studio`     | Prisma Studio                               |

## Technik

Next.js 16 (App Router) · TypeScript strict · Tailwind 4 · Prisma 7 mit PostgreSQL ·
NextAuth v5 (Credentials) · Vitest.

Projektkonventionen stehen in [AGENTS.md](./AGENTS.md).
