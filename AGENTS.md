# Churntron – Projektkonventionen

Internes Vertriebs-Tool der TNG. Drei Module: Churn-Leitfaden, Provisionen, Challenges.
Der aktuelle Stand ist das Grundgerüst (Stage 1) – die Module sind angelegt und mit
echten Daten befüllt, die Fachlogik folgt in Stage 2–5 (siehe `PLAN.md`).

## Die eine Regel, die nicht verhandelbar ist

**In der Datenbank stehen keine Klardaten von Kundinnen und Kunden.**
Kein Name, keine Adresse, keine Telefonnummer, keine E-Mail – auch nicht als Testdaten.
Der Bezug zum Kunden läuft ausschließlich über `Contract.externalRef`
(Vertrags- bzw. Kundennummer). Die Klardaten bleiben im lokalen Kampagnen-Lookup,
das offline auf dem Rechner der Vertriebler läuft.

`src/lib/__tests__/schema-privacy.test.ts` prüft das gegen `prisma/schema.prisma`.
Wenn der Test rot wird, ist das kein Formfehler – dann wurde die Zusage gebrochen.

## Ordnerstruktur

```
src/
  app/
    (dashboard)/        Route-Gruppe mit Auth-Guard, Sidebar und Topbar
      dashboard/        Übersicht + die drei Module, je mit loading.tsx
    login/              Anmeldung (Server Action)
    api/auth/           NextAuth-Handler
  components/
    ui/                 Primitive: Card, Button, Badge, Skeleton, Progress
    skeletons/          Ladezustände – je ein Baustein pro wiederkehrendem Block
    layout/             Sidebar, Topbar, Theme-Umschalter
  lib/
    db.ts               Prisma-Client (Driver-Adapter, Prisma 7)
    auth.ts             NextAuth mit Credentials-Provider
    auth.config.ts      edge-sicherer Teil für die Middleware
    queries.ts          ALLE Datenabfragen der Seiten
    labels.ts           deutsche Beschriftungen der Enum-Werte
    utils.ts            cn, formatEuro, formatDate, initials
    dev.ts              devDelay für die Skeleton-Demo
```

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
