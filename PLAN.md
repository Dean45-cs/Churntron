# Churntron – Projektplan

Internes Vertriebs-Tool der TNG. Module: Kampagnen-Lookup, Churn-Leitfaden,
Provisionen, Challenges.

**Stand: Stage 1 (Grundgerüst), Stage 4 (Provisions-Tracker) und das
Kampagnen-Lookup sind fertig.** Stage 2, 3 und 5 stehen aus.

---

## 1. Wie die Teile zusammenspielen

Das **Kampagnen-Lookup** ist seit September 2026 Teil von Churntron (vorher: einzelne
HTML-Datei auf dem Rechner). Der Grund war ein praktischer: die Vertriebler wollten
sich während des Gesprächs eigene Notizen machen können, und dafür war in der alten
Datei kein Platz – sie kennt nur Haken und die Bewertung, und beides geht an PP.

Am Datenfluss hat sich dadurch **nichts** geändert, und das ist der entscheidende Punkt:

```
Excel-Liste (PP)  →  Kampagnen-Lookup (im Browser, Klardaten)  →  Reporting-CSV  →  Churntron (DB)
                              ↓                                                          ↓
                     Restliste zurück an PP                       Churn · Provisionen · Challenges
```

Das Lookup läuft weiterhin vollständig lokal – jetzt im Browser statt in einer Datei.
Die Liste wird nicht hochgeladen, und zwischen Lookup und Datenbank liegt nach wie vor
die Reporting-CSV. Was Churntron aus dem Lookup sieht, ist genau das, was es vorher
auch gesehen hat: nichts, bis jemand die CSV importiert.

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

| Modell             | Zweck                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| `Team`, `User`     | Vertriebler und Ausbilder, Rollen `REP` / `ADMIN`                      |
| `Contract`         | Vertrag mit Status, Kündigungsgrund und Wiedervorlage-Termin           |
| `ChurnActivity`    | Anrufe, Mails, Angebote je Vertrag                                     |
| `CommissionRule`   | Provisionskatalog **als Daten**, nicht im Code                         |
| `Commission`       | Gebuchte Provisionsposition, Vertrag optional                          |
| `CommissionPayout` | Was tatsächlich ausgezahlt wurde – Grundlage des Abgleichs             |
| `UserSettings`     | Wochenstunden und Steuermerkmale je Nutzer                             |
| `Challenge`        | Wettbewerb mit Metrik, Ziel und Zeitraum                               |
| `PointsEvent`      | Punkte als **Einzelereignisse** – trägt den Leaderboard-Zeitraumfilter |
| `ImportBatch`      | Import-Charge mit erkannter Spaltenzuordnung                           |

Zwei bewusste Entscheidungen:

- Punkte laufen über Einzelereignisse statt über einen Zähler pro Nutzer. Nur so
  funktioniert der Zeitraumfilter Tag/Woche/Monat aus Stage 5.
- Das Provisionsmodell steckt in `CommissionRule` als Daten. Das hat sich in Stage 4
  ausgezahlt: der Katalog (Version 1.3) ließ sich als Datei einspielen, ohne dass eine
  Zeile Fachlogik entstand. Staffeln und Boni passen später in dieselbe Tabelle.
- `Commission.contractId` ist optional. Im Tracker ist eine Buchung ein Tastendruck;
  auf einen Vertragsdatensatz zu warten, den es in der Datenbank noch gar nicht gibt,
  würde genau das kaputt machen. Die Vertragsnummer wird als Freitext nachgetragen.

**Grundregel: keine Klardaten in der Datenbank.** Siehe README und `AGENTS.md`.

---

## 4. Stages

### Stage 1 – Grundgerüst ✅ fertig

Next.js 16, TypeScript strict, Tailwind 4, Prisma 7 mit PostgreSQL, NextAuth mit
Demo-Login, Sidebar-Layout, Dark Mode, alle vier Seiten mit echten Daten,
durchgängiges Skeleton-Loading, ESLint/Prettier/Vitest.

### Kampagnen-Lookup ✅ fertig

Nicht ursprünglich geplant – das Tool sollte als HTML-Datei bleiben. Der Auslöser war
der Wunsch nach eigenen Notizen während des Gesprächs, und der ließ sich in einer
Datei ohne Speicher schlecht unterbringen.

- **Übernommen wie es war.** Spaltenerkennung, Wählformat, Mehrfachnummern,
  Jira-Verknüpfung, Erledigt/Prüfen-Haken, das Kampagnen-Formular und die
  Ein-Treffer-Automatik bei der Suche.
- **Neu: interne Notizen.** Freitext je Datensatz plus acht Bausteine zum Antippen,
  über das Suchfeld wiederfindbar, im `localStorage` gespeichert. Der Bezug läuft über
  `recKey()` (UUID → Vertrag → Kundennummer), also findet die Liste von morgen die
  Notizen von heute wieder.
- **Die beiden Exporte sind strukturgleich geblieben** – das war die Bedingung. Ein
  Differenztest gegen die Originalfassung und ein Durchlauf im echten Browser
  bestätigen das; `lookup-export.test.ts` hält es fest.
- **Läuft vollständig im Browser.** Kein `fetch`, keine Server Action, kein Prisma –
  `lookup-privacy.test.ts` prüft das gegen den Quelltext. Ohne diese Trennung wäre
  aus dem Umzug ein Datenschutzvorfall geworden.
- SheetJS 0.20.3 liegt unter `src/vendor/sheetjs/` (Begründung im dortigen README)
  und wird erst beim ersten Dateizugriff nachgeladen.

Offen geblieben: ein Export der Notizen für die eigene Nachbereitung. Bewusst nicht
gebaut, weil er in keinen der beiden bestehenden Exporte gehört und niemand danach
gefragt hat.

### Stage 2 – Datenimport

`/import`: Upload von CSV/XLSX, Spaltenzuordnung mit Vorschau, Schreiben via Prisma.

**Der Parser ist schon da.** Beim Umzug des Lookups wurde er 1:1 nach
`src/lib/lookup/parser.ts` portiert – getypt, aber im Verhalten unverändert
(geprüft mit einem Differenztest gegen die Originalfassung, 503 Vergleiche):

| Funktion                        | Was sie kann                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `detectHeaderRow(aoa)`          | findet die Kopfzeile in den ersten 15 Zeilen, auch bei Vorspann                                                             |
| `detectColumns(headers, rows)`  | Zuordnung über Synonym-Katalog **plus** Inhaltsprüfung, mit `STRICT`-Typen gegen Fehltreffer wie „Vertragsstatus" → Vertrag |
| `buildRecords(aoa)`             | baut die Datensätze inklusive zusammengesetztem Namen und Adresse                                                           |
| `neutralizeFormula` / `csvCell` | Schutz gegen CSV-Formel-Injection (in `src/lib/lookup/export.ts`)                                                           |

Der Import benutzt diesen Parser mit, statt einen zweiten zu bauen – deshalb liegt er
in `src/lib/` und nicht neben der Lookup-Seite. Was der Import zusätzlich braucht, ist
nur das Verwerfen der Klardaten-Spalten: `name`, `telRaw`, `dials`, `address` und
`email` der `LookupRecord` gehen **nicht** in die Datenbank.

Offen bleibt eine anonymisierte Beispiel-Excel (Punkt 1 unten), um die Zuordnung gegen
eine echte Spaltenbelegung zu prüfen.

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

### Stage 4 – Provisions-Tracker ✅ fertig

Umgesetzt ist mehr als geplant, weil der Bedarf ein anderer war als angenommen: nicht
ein Forecast aus der Pipeline, sondern **selbst tracken**.

- **Katalog als Daten.** Alle 36 Sätze aus dem Provisionskatalog 1.3 stehen in
  `src/lib/commission-catalog.ts` und werden per Upsert in `CommissionRule` geschrieben.
- **Tracker.** Ein Tastendruck ist eine Buchung, mit optimistischem Zähler an der Taste,
  optionaler Vertragsnummer und Rückgängig-Taste. Der Betrag kommt aus dem Katalog.
- **Verdienst.** Summen für heute, Woche, Monat, Quartal, Jahr; Schnitt pro Stunde,
  Arbeitstag, Buchungstag, Kalendertag, Woche, Monat, Quartal und Jahr – brutto und netto.
- **Brutto-Netto-Rechner.** Rechnet den Aufschlag: Gehalt mit Provision minus Gehalt ohne.
- **Abgleich 20. zum 20.** Eingeben, was ausgezahlt wurde; stimmt es, sind alle Positionen
  mit einem Klick erledigt, sonst bleibt offen, was noch zu klären ist.

Offen geblieben: Regelpflege durch Admins in der Oberfläche (bislang über die Katalogdatei)
und die automatische Clawback-Frist aus `CommissionRule.clawbackDays`.

### Stage 5 – Challenges

Anlege-Formular für Admins, funktionaler Zeitraumfilter im Leaderboard,
automatische Punktevergabe beim Statuswechsel auf `WON_BACK`.

---

## 5. Fahrplan der drei Termine

**Termin 1 – Fundament & Churn**
Grundgerüst gemeinsam durchgehen · Kündigungsgründe-Katalog mit dem Ausbilder festlegen ·
Stage 2 mit einer echten (anonymisierten) Liste testen · Stage 3 bauen

**Termin 2 – Provisionen**
Stage 4 steht. Zu klären: Auszahlungsrhythmus bestätigen · Staffeln, Boni und
Stornofristen · Regelpflege in der Oberfläche

**Termin 3 – Challenges & Feinschliff**
Punktelogik festlegen · Stage 5 bauen · Design-Review über alle Module ·
offene Punkte für die Dynamics-Anbindung sammeln

---

## 6. Offene Punkte

1. **Eine anonymisierte Beispiel-Excel** – echte Spaltenüberschriften, Fantasie-Inhalte.
   Das Wichtigste von allen: das gesamte Import-Mapping hängt daran. Vor Stage 2.
2. **Kündigungsgründe-Katalog** – wie heißen die Gründe in den echten Listen?
   Das Enum `CancelReason` ist bislang ein Vorschlag. Vor Stage 3.
3. **Auszahlungsrhythmus bestätigen** – Angenommen ist: Periode vom 20. bis zum 19.,
   Auszahlung eine Abrechnung später. Der Katalog sagt nur „im Folgemonat abgerechnet".
   Nennt die Lohnbuchhaltung etwas anderes, sind es zwei Konstanten in
   `src/lib/period.ts` (`STICHTAG`, `AUSZAHLUNG_VERZUG_MONATE`).
4. **Staffeln, Sonderboni, Stornofristen** – der Katalog kennt bisher nur Fixbeträge.
   `CommissionRule.percent` und `clawbackDays` stehen bereit, sind aber ungenutzt.
5. **Steuerwerte 2027** – die Tabelle in `src/lib/brutto-netto.ts` gilt für 2025 und 2026.
6. **Punktelogik** – welche Aktivität zählt wie viel. Termin 3.
7. **Hosting** – Vorgaben der TNG-IT (Vercel erlaubt, oder interner Server?).
8. **Dynamics 365** – Zeitpunkt und Schnittstellen-Details des Custom-Builds.
