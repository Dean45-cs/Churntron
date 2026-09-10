# Churntron – Projektplan

Internes Vertriebs-Tool der TNG. Drei Module: Churn-Leitfaden, Provisionen, Challenges.

**Stand: Stage 1 (Grundgerüst) und Stage 4 (Provisions-Tracker) sind fertig,
aus Stage 3 steht der Gesprächsleitfaden.** Stage 2 und 5 stehen aus.

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

### Stage 3 – Churn-Modul (Gesprächsleitfaden ✅)

**Der Gesprächsleitfaden steht.** Winback Universal, Outbound nach Kündigungseingang:
alle elf Phasen im Wortlaut des Dokuments, die Einwandbehandlung und die Leitplanken.
Er läuft in drei Hüllen aus einem Bauteil – als Seite unter „Gespräch", als Schublade,
die beim Arbeiten in den anderen Modulen offen bleibt, und als eigenes Fenster zum
Danebenlegen neben das Kampagnen-Lookup.

Die Leitregel dafür: **das Werkzeug hilft, es erzeugt keine Arbeit.** Kein Protokoll,
kein Pflichtfeld, kein Datenbankschreiben. Gemerkt wird nur die Stelle, an der man
steht – und die merkt es sich von selbst.

Offen bleibt der Rest des Moduls: Detailansicht je Vertrag, Aktivitäten erfassen,
Wiedervorlage abhaken. Und im Leitfaden selbst die Closer W1–W18 mit der Zuordnung je
Kündigertyp; mit ihnen kommt der Typ-Umschalter, denn vorher bewirkt er nichts. Wo das
Dokument auf Doc 02 und Doc 05 verweist, steht im Werkzeug eine sichtbare Lücke.

**Die MDX-Entscheidung ist revidiert.** Der Leitfaden steht als typisierte Daten in
`src/lib/leitfaden.ts`. Er ist keine Prosa, sondern Struktur – Phasen, Zuordnungen,
Eskalationsstufen, Einwände –, und genau diese Struktur trägt später den Typ-Filter und
die Closer-Eskalation. MDX bräuchte erst eine Pipeline und könnte die Struktur nicht
liefern. Der Weg ist derselbe wie beim Provisionskatalog: erst Datei, später Datenbank
mit Pflege in der Oberfläche.

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
9. **Doc 02 und Doc 05 zum Leitfaden** – der Closer-Katalog W1–W18 mit den Top 3 je
   Kündigertyp und die Eskalationsstufen als Euro-Pakete. Vier Closer (W11, W12, W16,
   W17) sind bislang nirgends benannt. Ohne die beiden Dokumente bleiben Phase 4 und
   die Einwandliste unvollständig – im Werkzeug als „folgt" markiert.
