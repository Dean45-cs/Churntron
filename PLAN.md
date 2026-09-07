# Churntron – Projektplan

Internes Vertriebs-Tool der TNG. Drei Module: Churn-Leitfaden, Provisionen, Challenges.

**Stand: Stage 1 (Grundgerüst) ist fertig.** Stage 2–5 stehen aus.

---

## 1. Wie die Teile zusammenspielen

Das bestehende **Kampagnen-Lookup** (einzelne HTML-Datei, läuft offline auf dem Rechner)
bleibt, wie es ist. Es sieht die echten Kundendaten, wird für den Anruf benutzt und
exportiert am Schichtende eine Reporting-CSV. Churntron liest diese CSV – und sonst nichts.

```
Excel-Liste (PP)  →  Lookup-Tool (lokal, Klardaten)  →  Reporting-CSV  →  Churntron (DB)
                                                                              ↓
                                                        Churn · Provisionen · Challenges
```

Später ersetzt ein `DynamicsSource` den CSV-Weg, ohne dass UI oder Datenmodell sich ändern.

---

## 2. Design-Tokens

Übernommen aus dem TNG-Designsystem, nicht geschätzt. Implementiert in `src/app/globals.css`.

```css
--tng-navy: #00336e; /* Navigation, Primär-Buttons, Überschriften */
--tng-orange: #f18700; /* nur Highlights, CTAs, Warnstatus */
```

Schrift: **Archivo** (Text und Überschriften), **IBM Plex Mono** (Vertragsnummern und
Kennzahlen). Karten `rounded-2xl`, weiche Schatten, viel Weißraum. Dark Mode von Anfang an;
dort ist die Primärfarbe auf `#6BA4DE` aufgehellt, weil reines Navy zu wenig Kontrast hätte.

> Ein Scraping von tng.de (ursprünglich als "Stage 0" geplant) entfällt: die Werte lagen
> im TNG-Lernzettel-Designsystem bereits verifiziert vor.

---

## 3. Datenmodell

Vollständig in `prisma/schema.prisma`. Kern:

| Modell           | Zweck                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| `Team`, `User`   | Vertriebler und Ausbilder, Rollen `REP` / `ADMIN`                      |
| `Contract`       | Vertrag mit Status, Kündigungsgrund und Wiedervorlage-Termin           |
| `ChurnActivity`  | Anrufe, Mails, Angebote je Vertrag                                     |
| `CommissionRule` | Provisionsregeln **als Daten**, nicht im Code                          |
| `Commission`     | Provisionsposition je Vertrag und Monat                                |
| `Challenge`      | Wettbewerb mit Metrik, Ziel und Zeitraum                               |
| `PointsEvent`    | Punkte als **Einzelereignisse** – trägt den Leaderboard-Zeitraumfilter |
| `ImportBatch`    | Import-Charge mit erkannter Spaltenzuordnung                           |

Zwei bewusste Entscheidungen:

- Punkte laufen über Einzelereignisse statt über einen Zähler pro Nutzer. Nur so
  funktioniert der Zeitraumfilter Tag/Woche/Monat aus Stage 5.
- Das Provisionsmodell steckt in `CommissionRule` als Daten. Staffeln und Boni sind noch
  offen; im Code verdrahtet müssten wir sie dreimal umbauen.

**Grundregel: keine Klardaten in der Datenbank.** Siehe README und `AGENTS.md`.

---

## 4. Stages

### Stage 1 – Grundgerüst ✅ fertig

Next.js 16, TypeScript strict, Tailwind 4, Prisma 7 mit PostgreSQL, NextAuth mit
Demo-Login, Sidebar-Layout, Dark Mode, alle vier Seiten mit echten Daten,
durchgängiges Skeleton-Loading, ESLint/Prettier/Vitest.

### Stage 2 – Datenimport

`/import`: Upload von CSV/XLSX, Spaltenzuordnung mit Vorschau, Schreiben via Prisma.

**Der Parser wird nicht neu geschrieben.** Das Lookup-Tool enthält ihn bereits – im
`<script>`-Block nach der SheetJS-Bibliothek, frameworkfrei und über `module.exports`
schon Node-testbar:

| Funktion                        | Was sie kann                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `detectHeaderRow(aoa)`          | findet die Kopfzeile in den ersten 15 Zeilen, auch bei Vorspann                                                             |
| `detectColumns(headers, rows)`  | Zuordnung über Synonym-Katalog **plus** Inhaltsprüfung, mit `STRICT`-Typen gegen Fehltreffer wie „Vertragsstatus" → Vertrag |
| `buildRecords(aoa)`             | baut die Datensätze inklusive zusammengesetztem Namen und Adresse                                                           |
| `neutralizeFormula` / `csvCell` | Schutz gegen CSV-Formel-Injection                                                                                           |

Vorgehen: 1:1 nach `src/lib/import/parser.ts` portieren, Typen drübersetzen, Verhalten
nicht ändern, Tests gegen eine echte Beispieldatei. Die Telefon-Logik
(`normalizePhone`, `phonesFrom`) bleibt draußen – sie gehört zu den Klardaten.

Die Reporting-CSV des Lookup-Tools hat bereits die passenden Spalten:

```
Kampagne; Datei; Kundennummer; Vertrag; Name; Telefon; Waehlnummer; Status;
HomeID_aufgenommen; Beratungsprotokoll_ausgehaendigt; Bewertung_Beratung; Bearbeitet_am
```

`Name`, `Telefon` und `Waehlnummer` werden beim Import **verworfen**,
`Vertrag`/`Kundennummer` werden zu `externalRef`.

### Stage 3 – Churn-Modul

Detailansicht je Vertrag, Gesprächsleitfaden passend zum Kündigungsgrund, Aktivitäten
erfassen, Wiedervorlage abhaken. Die Leitfaden-Texte kommen als MDX-Dateien pro Grund,
damit der Ausbilder sie ohne Code-Änderung anpassen kann.

### Stage 4 – Provisions-Tracker

Monats-Forecast aus dem Pipeline-Stand, Regelpflege für Admins, Clawback-Logik.

### Stage 5 – Challenges

Anlege-Formular für Admins, funktionaler Zeitraumfilter im Leaderboard,
automatische Punktevergabe beim Statuswechsel auf `WON_BACK`.

---

## 5. Fahrplan der drei Termine

**Termin 1 – Fundament & Churn**
Grundgerüst gemeinsam durchgehen · Kündigungsgründe-Katalog mit dem Ausbilder festlegen ·
Stage 2 mit einer echten (anonymisierten) Liste testen · Stage 3 bauen

**Termin 2 – Provisionen**
Provisionsmodell klären (Staffeln, Boni, Stornofristen) · Stage 4 bauen

**Termin 3 – Challenges & Feinschliff**
Punktelogik festlegen · Stage 5 bauen · Design-Review über alle Module ·
offene Punkte für die Dynamics-Anbindung sammeln

---

## 6. Offene Punkte

1. **Eine anonymisierte Beispiel-Excel** – echte Spaltenüberschriften, Fantasie-Inhalte.
   Das Wichtigste von allen: das gesamte Import-Mapping hängt daran. Vor Stage 2.
2. **Kündigungsgründe-Katalog** – wie heißen die Gründe in den echten Listen?
   Das Enum `CancelReason` ist bislang ein Vorschlag. Vor Stage 3.
3. **Provisionsmodell** – Staffeln, Sonderboni, Stornofristen. Termin 2.
4. **Punktelogik** – welche Aktivität zählt wie viel. Termin 3.
5. **Hosting** – Vorgaben der TNG-IT (Vercel erlaubt, oder interner Server?).
6. **Dynamics 365** – Zeitpunkt und Schnittstellen-Details des Custom-Builds.
