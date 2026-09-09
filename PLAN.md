# Churntron – Projektplan

Internes Vertriebs-Tool der TNG. Vier Module: Churn-Leitfaden, Einwand-Wiki,
Provisionen, Challenges.

**Stand: Stage 1 (Grundgerüst), Stage 4 (Provisions-Tracker), Stage 6
(Einwand-Wiki) und Stage 7 (Konten und Profile) sind fertig.**
Stage 2, 3 und 5 stehen aus.

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
| `UserAvatar`       | Profilbild als BYTEA – eigene Tabelle, damit die Bytes nicht mitlesen  |
| `Contract`         | Vertrag mit Status, Kündigungsgrund und Wiedervorlage-Termin           |
| `ChurnActivity`    | Anrufe, Mails, Angebote je Vertrag                                     |
| `CommissionRule`   | Provisionskatalog **als Daten**, nicht im Code                         |
| `Commission`       | Gebuchte Provisionsposition, Vertrag optional                          |
| `CommissionPayout` | Was tatsächlich ausgezahlt wurde – Grundlage des Abgleichs             |
| `UserSettings`     | Wochenstunden und Steuermerkmale je Nutzer                             |
| `Challenge`        | Wettbewerb mit Metrik, Ziel und Zeitraum                               |
| `PointsEvent`      | Punkte als **Einzelereignisse** – trägt den Leaderboard-Zeitraumfilter |
| `ImportBatch`      | Import-Charge mit erkannter Spaltenzuordnung                           |
| `Objection`        | Ein Eintrag der Einwand-Wiki – bewusst ohne Vertragsbezug              |

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

### Stage 6 – Einwand-Wiki ✅ fertig

Nicht ursprünglich geplant, aber aus dem Alltag heraus gefordert: Gute
Einwandbehandlungen stehen bisher auf Zetteln, im Kopf oder nirgends – und im Gespräch
fehlen sie genau dann, wenn sie gebraucht werden.

- **Suche, die im Gespräch mithält.** Getippt wird, was der Kunde gerade gesagt hat.
  „zu teuer" findet Preiserhöhung, Rabattforderung und „woanders günstiger" mit.
  Vier Schichten: Umlaute ausschreiben, Stammformen, Wortfelder, Tippfehler-Abstand.
  Reine Rechnung in `src/lib/objection-search.ts`, im Browser ausgeführt.
- **Zweigeteilte Trefferliste.** Oben, was den Einwand selbst trifft; darunter, was nur
  im Antworttext vorkommt.
- **Drei Schritte statt Fließtext.** Ein Eintrag zeigt _Jetzt sagen · Das zählt · Und
  dann fragen_ – im Gespräch wird nicht gelesen, sondern gesprochen. Die Form kommt vom
  Autor (erste Zeile = Einstiegssatz, danach ein Gedanke pro Zeile); wer einen Absatz
  tippt, bekommt einen Absatz.
- **Pflege in der Oberfläche.** Anlegen, überarbeiten, archivieren – ohne Umweg über
  einen Admin und ohne Code-Änderung. Der Startbestand (24 Einträge) steht in
  `src/lib/objection-catalog.ts`. Der Seed ergänzt fehlende Einträge und frischt einen
  Starteintrag auf, solange ihn niemand überarbeitet hat – danach gehört er dem Team.
- **Datenschutz an der Eingabe.** Die erste Stelle im Projekt, an der Freitext von Hand
  in die Datenbank kommt: Ziffernfolgen ab sechs Stellen und E-Mail-Adressen werden
  abgewiesen.

Offen: Die Wortfelder in `THEMEN` sind mit dem Vertriebsalltag abzugleichen – welche
Begriffe fallen am Telefon wirklich? Das ist ein Termin mit dem Team, keine Programmierung.

### Stage 7 – Konten, Profile und stille Aktualisierung ✅ fertig

- **Konto-Bereich** unter `/dashboard/konto`: Profilbild, Anzeigename, Funktion und
  ein kurzer Text; Anzeige-Einstellungen; Passwort ändern mit Prüfung des alten.
- **Nutzerverwaltung** für Admins: Konten anlegen, Rolle und Team setzen,
  deaktivieren, Passwort zurücksetzen. Keine Selbstregistrierung – wer Zugang
  bekommt, entscheidet die Teamleitung.
- **Sitzung aus der Datenbank.** Das JWT trägt nur noch die ID. Vorher standen Name,
  Rolle und Team im Token: eine Namensänderung wäre bis zum nächsten Anmelden
  unsichtbar geblieben, und ein deaktiviertes Konto hätte weiterarbeiten können.
- **Profilbild in Postgres.** Der Browser schneidet auf 256×256 zu (rund 30 KB), der
  Server prüft Format und Größe an den Magic Bytes und liefert es unter
  `/api/avatar/[userId]?v=…` nur an Angemeldete aus. Kein S3, kein Vercel Blob –
  ein weiterer Anbieter samt Auftragsverarbeitung wäre für 30 Bilder unverhältnismäßig.

**Was „live synchronisieren" hier heißt.** Die Daten waren nie getrennt: alle
arbeiten auf derselben Datenbank. Gefehlt hat nur das Nachladen. Das macht jetzt
`router.refresh()` im eingestellten Takt (Standard 30 s, abschaltbar), pausiert bei
verstecktem Fenster.

Echtes Push über SSE oder WebSockets wurde **bewusst nicht** gebaut. Auf Vercel ist
jede offene Verbindung eine laufende Funktion mit Laufzeitdeckel, und zwischen den
Instanzen gibt es keinen gemeinsamen Speicher: eine Buchung in Instanz 1 erreicht
einen Stream in Instanz 2 nie. Es bräuchte einen Vermittler – Postgres
`LISTEN/NOTIFY` (verträgt sich schlecht mit Neons Pooling) oder einen Dienst wie
Upstash, Pusher, Ably. Damit stünden Auftragsverarbeitung und Drittlandtransfer ein
zweites Mal auf der Liste, für einen Zugewinn von einer halben Minute.

Auf einem internen TNG-Server ist dasselbe dagegen fast geschenkt: ein EventEmitter
im Prozess, ein Tag Arbeit, kein Fremdanbieter. Die Entscheidung hängt also an
offenem Punkt 8 (Hosting) und nicht am Code.

Wo Live wirklich etwas wert wäre, ist ohnehin nicht der Tracker – dort bucht jeder
für sich –, sondern **Stage 3**: verhindern, dass zwei Leute denselben gekündigten
Kunden anrufen. Das löst eine Spalte (`claimedById`, `claimedAt`) plus die
Aktualisierung von hier, keine WebSockets.

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
Wortfelder der Einwand-Wiki mit dem Team abgleichen ·
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
   `src/lib/period.ts` (`STICHTAG`, `AUSZAHLUNG_VERZUG_MONATE`). Bis das bestätigt ist,
   zeigt die Oberfläche ohnehin beide Zuschnitte nebeneinander – Kalendermonat und
   Abrechnungszeitraum, siehe `src/lib/zeitraum.ts`. Ein anderer Stichtag ändert dann
   nur die zweite Spalte, nicht die Ansicht.
4. **Staffeln, Sonderboni, Stornofristen** – der Katalog kennt bisher nur Fixbeträge.
   `CommissionRule.percent` und `clawbackDays` stehen bereit, sind aber ungenutzt.
5. **Steuerwerte 2027** – die Tabelle in `src/lib/brutto-netto.ts` gilt für 2025 und 2026.
6. **Punktelogik** – welche Aktivität zählt wie viel. Termin 3.
7. **Wortfelder der Einwand-Wiki** – `THEMEN` in `src/lib/objection-search.ts` ist ein
   Vorschlag aus dem Katalog heraus. Welche Begriffe am Telefon wirklich fallen, weiß
   das Team. Eine Runde gemeinsam durchgehen, dann steht die Suche.
8. **Hosting** – Vorgaben der TNG-IT (Vercel erlaubt, oder interner Server?).
   Hängt jetzt auch an der Frage, ob echtes Push je gebaut wird (Stage 7).
9. **Dynamics 365** – Zeitpunkt und Schnittstellen-Details des Custom-Builds.
10. **Anwesenheit im Leaderboard?** Ein „Toni ist online"-Punkt wäre technisch klein,
    aber Verhaltenskontrolle. Vor dem Bauen der Betriebsrat, nicht danach –
    siehe DEPLOY.md. Bislang steht bewusst nur `lastLoginAt` in der Datenbank.
