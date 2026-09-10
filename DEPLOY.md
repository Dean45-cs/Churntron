# Churntron online stellen

Ziel: eine öffentlich erreichbare Demo, die du deinem Ausbilder per Link zeigen kannst,
ohne dass jemand etwas installieren muss.

**Was hier online geht, sind ausschließlich erfundene Daten** – Fantasie-Vertragsnummern
und sechs ausgedachte Kolleginnen und Kollegen aus dem Seed. Deshalb ist diese Demo
datenschutzrechtlich unkritisch. Lies trotzdem den Abschnitt
[Bevor echte Daten drauf dürfen](#bevor-echte-daten-drauf-dürfen) am Ende.

Du brauchst nur ein Konto: **Vercel** (Login mit GitHub). Die Datenbank legst du aus
Vercel heraus mit an. Rechne mit 15 Minuten.

---

## 1. Datenbank anlegen – aus Vercel heraus

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden.
2. Oben im Menü auf **Storage** → **Create Database** → **Neon** (Serverless Postgres).
3. Als Region **Frankfurt (`eu-central-1`)** wählen. Wichtig: damit liegen die Daten in
   der EU.
4. Name z. B. `churntron`, anlegen.

**Du musst dir keinen Connection String merken.** Sobald die Datenbank mit dem Projekt
verbunden ist, trägt Vercel `DATABASE_URL` und `DATABASE_URL_UNPOOLED` von selbst ein.

> Das Passwort der Datenbank ist ein echtes Zugangsdatum: nicht in Chats, Tickets oder
> Screenshots weitergeben. Falls es doch einmal passiert, in der Neon-Ansicht das
> Passwort der Rolle zurücksetzen – oder die Datenbank löschen und neu anlegen, solange
> nur Demo-Daten drin sind.

## 2. Ein Secret erzeugen

NextAuth signiert damit die Sitzungen. Erzeuge dir einen zufälligen Wert – wenn du kein
Terminal hast, tut es jeder Passwortgenerator mit 32 Zeichen:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Nimm nicht den Wert aus `.env.example`** – der steht öffentlich im Repository.

## 3. Projekt importieren und verbinden

1. **Add New → Project**, Repository `Dean45-cs/Churntron` auswählen.
2. Als **Branch** `claude/vertriebs-tool-tng-plan-im91wm` wählen, solange der Pull Request
   noch nicht gemergt ist.
3. Unter **Environment Variables** diese drei eintragen – `DATABASE_URL` gehört **nicht**
   dazu, die kommt aus der Datenbank-Verbindung:

   | Name            | Wert                                        |
   | --------------- | ------------------------------------------- |
   | `AUTH_SECRET`   | der erzeugte Wert aus Schritt 2             |
   | `DEMO_PASSWORD` | ein Passwort deiner Wahl, z. B. `churntron` |
   | `SKELETON_DEMO` | `1`                                         |

4. **Deploy** klicken.
5. Danach im Projekt auf **Storage** → die Datenbank aus Schritt 1 → **Connect**.
   Vercel setzt jetzt `DATABASE_URL` und löst automatisch einen neuen Build aus.

> Der **erste Build schlägt fehl**, wenn die Datenbank beim Deployen noch nicht verbunden
> war. Das ist normal – nach dem Verbinden läuft der nächste Build durch.

`SKELETON_DEMO=1` macht die Ladezustände sichtbar (die Datenbank wäre sonst zu schnell)
und blendet oben den Hinweis „Demo · erfundene Daten" ein. Genau das willst du beim
Vorführen. In einer produktiven Umgebung mit echten Daten hat die Variable nichts zu
suchen.

`vercel-build` legt die Tabellen beim Deployen automatisch an.

### Wo die Daten liegen

Die **Datenbank steht in Frankfurt** – das legst du in Schritt 1 fest und es gilt unabhängig
vom Hosting.

Die **Anwendung selbst** läuft in der Standardregion deines Vercel-Kontos. In der ersten
Zeile jedes Build-Logs steht, welche das ist (z. B. `Running build in Washington, D.C. – iad1`).
Eine eigene Ausführungsregion festzulegen, ist bei Vercel den bezahlten Stufen vorbehalten.

Für diese Demo mit erfundenen Daten ist das ohne Belang. Für einen echten Einsatz ist es ein
Argument mehr, das mit der TNG-IT zu klären – entweder eine bezahlte Stufe mit EU-Region oder
gleich internes Hosting (siehe unten, es besteht keine Bindung an Vercel).

## 4. Fertig – öffnen und anmelden

Du musst nichts weiter tun: `vercel-build` legt beim Deployen die Tabellen an **und
füllt sie mit den Demo-Daten**, solange die Datenbank noch leer ist. Bei jedem weiteren
Deploy passiert das nicht noch einmal – deine Daten bleiben stehen.

Vercel-URL öffnen und mit `rep@tng.de` oder `admin@tng.de` anmelden. Passwort ist der
Wert, den du als `DEMO_PASSWORD` gesetzt hast.

> **Demo-Daten zurücksetzen**, falls du beim Vorführen etwas verstellt hast: in Neon unter
> _SQL Editor_ einmal ausführen und danach bei Vercel _Redeploy_ klicken.
>
> ```sql
> TRUNCATE "PointsEvent","Commission","ChurnActivity","Contract",
>          "ImportBatch","CommissionRule","Challenge","User","Team" CASCADE;
> ```

---

## Wenn etwas nicht klappt

**Zuerst immer: `/api/health` aufrufen.** Hänge das an deine Deployment-URL an, also
`…vercel.app/api/health`. Die Seite antwortet mit einer kurzen Übersicht, welche
Umgebungsvariablen gesetzt sind und ob die Datenbank antwortet — und nennt unter `fehlt`
direkt, was zu tun ist.

Dort stehen **nur Ja/Nein-Angaben, niemals die Werte selbst**; du kannst die Ausgabe also
gefahrlos weitergeben.

| Was `/api/health` zeigt                  | Was zu tun ist                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `AUTH_SECRET: false`                     | Variable anlegen (Schritt 2), für **alle** Umgebungen, dann neu deployen |
| `DATABASE_URL: false`                    | Im Projekt unter **Storage** die Datenbank verbinden                     |
| `datenbank: fehler` trotz gesetzter URL  | Datenbank verbunden, aber nicht erreichbar — Neon-Projekt prüfen         |
| `bereit: true`, Login scheitert trotzdem | Passwort passt nicht zum gespeicherten Hash — siehe unten                |

> **Umgebungsvariablen gelten bei Vercel pro Umgebung.** Eine nur für _Production_
> gesetzte Variable fehlt in einem **Preview**-Deployment — und der Branch läuft als
> Preview, solange der Pull Request nicht gemergt ist. Setz die Variablen deshalb für
> Production, Preview und Development.

**„There was a problem with the server configuration" beim Login**
Auth.js meldet damit jeden Konfigurationsfehler, ohne zu sagen welchen. `/api/health`
sagt es.

**Login sagt „E-Mail oder Passwort stimmt nicht"**
Die Passwörter liegen **gehasht** in der Datenbank, gesetzt beim Seed. Wurde
`DEMO_PASSWORD` nachträglich geändert, passt der neue Wert nicht mehr dazu. Abhilfe:
Variable `FORCE_SEED` auf `1` setzen, neu deployen, danach `FORCE_SEED` wieder entfernen.
Der Seed setzt die Demo-Daten dann samt Passwörtern neu.

**Der Build läuft durch, dann `No Output Directory named "dist" found`**
Vercel hält das Projekt nicht für eine Next.js-Anwendung. Das `vercel.json` im Repo setzt
`"framework": "nextjs"` und sollte das verhindern. Falls es trotzdem auftritt:
**Settings → Build & Deployment → Framework Preset** auf **Next.js** stellen und ein
eventuell gesetztes **Output Directory** wieder leeren.

> Tritt der Fehler bei einem **Redeploy** auf, prüfe im Log die Zeile `Cloning … (Commit: …)`.
> „Redeploy" auf einem älteren Deployment baut auch den **alten** Commit — samt der Fehler,
> die inzwischen behoben sind. Für den aktuellen Stand das neueste Deployment neu bauen
> oder einfach einen neuen Commit pushen.

**Der Build bricht ab mit `datasource.url property is required`**
Die Datenbank ist noch nicht mit dem Projekt verbunden. Im Projekt unter **Storage** die
Datenbank verbinden — danach steht `DATABASE_URL` und der nächste Build läuft.

**Der Build bricht bei der Migration mit einem Lock-Fehler ab**
Sollte nicht passieren: Migrationen laufen über `DATABASE_URL_UNPOOLED`, weil die
gepoolte Verbindung die dafür nötigen Sperren nicht halten kann. Falls die Variable
fehlt, in den Environment Variables nachtragen (die direkte Verbindung, ohne `-pooler`
im Hostnamen).

---

## Bevor echte Daten drauf dürfen

Die Demo läuft mit erfundenen Daten. Sobald echte dazukämen, sind drei Dinge zu klären –
und keines davon ist technisch:

1. **Auftragsverarbeitungsvertrag.** Vercel und Neon bieten einen an, aber abschließen
   muss ihn **TNG**, nicht ein privater Account.
2. **Drittlandtransfer.** Vercel ist ein US-Unternehmen. Das lässt sich absichern
   (Standardvertragsklauseln bzw. EU-US Data Privacy Framework); welche Grundlage aktuell
   trägt, muss die TNG-IT prüfen.
3. **Mitbestimmung.** Kundendaten sind hier gar nicht das Problem – die bleiben im
   lokalen Lookup. Aber Provisionen und Leaderboard sind **Mitarbeiter**-Leistungsdaten
   und damit nach § 87 BetrVG mitbestimmungspflichtig. Der Betriebsrat muss gefragt
   werden, egal wo gehostet wird.

   Dazu gehören seit den Profilen zwei weitere Punkte: Das **Profilbild** ist ein
   personenbezogenes Datum. Es ist freiwillig, jederzeit im Konto löschbar und wird
   nur an angemeldete Kolleginnen und Kollegen ausgeliefert – aber es gehört auf die
   Liste. Und Churntron speichert bewusst **keinen Anmeldeverlauf**: nur den Zeitpunkt
   der letzten Anmeldung, damit Admins tote Konten finden. Eine Anwesenheitsanzeige
   („wer ist gerade online") wäre Verhaltenskontrolle und ist deshalb nicht gebaut.

**Es besteht keine Bindung an Vercel.** Im Code steckt nichts Vercel-Spezifisches – das
ist eine normale Next.js-Anwendung. Sagt die TNG-IT „kein US-Cloud", läuft dasselbe
Repository ohne Codeänderung auf einem internen Server oder im Docker-Container
(`npm run build && npm start`).
