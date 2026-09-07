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

Die **Anwendung selbst** läuft dort, wo Vercel sie hinlegt; auf der kostenlosen Stufe ist das
die Standardregion des Kontos (oft `iad1`, USA). Eine eigene Ausführungsregion zu erzwingen
ist ein kostenpflichtiges Vercel-Feature – ein `vercel.json` mit `regions` lässt den Deploy
auf der freien Stufe fehlschlagen, nachdem der Build bereits durchgelaufen ist.

Für diese Demo mit erfundenen Daten ist das ohne Belang. Für einen echten Einsatz ist es
ein Argument mehr, das mit der TNG-IT zu klären – entweder eine bezahlte Stufe mit
EU-Region oder gleich internes Hosting (siehe unten, es besteht keine Bindung an Vercel).

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

**Der Build bricht ab mit `datasource.url property is required`**
`DATABASE_URL` fehlt in den Environment Variables oder wurde nur für eine Umgebung
gesetzt. In den Projekteinstellungen prüfen, dass sie für _Production_ gilt, und neu
deployen.

**Login lädt und wirft dich zurück auf die Anmeldeseite**
Wenn im Vercel-Log `UntrustedHost` steht, fehlt `trustHost` in `src/lib/auth.config.ts`.
Dort ist es gesetzt, das sollte also nicht passieren – falls doch, dort nachsehen.

**Login sagt „E-Mail oder Passwort stimmt nicht"**
Schritt 4 lief noch nicht, die Datenbank ist leer. Oder: du hast `DEMO_PASSWORD` bei
Vercel geändert, _nachdem_ du geseedet hast – die Passwörter liegen gehasht in der
Datenbank. Dann einfach nochmal seeden.

**Die Seite ist da, aber es fehlen alle Zahlen**
Ebenfalls der Seed aus Schritt 4.

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

**Es besteht keine Bindung an Vercel.** Im Code steckt nichts Vercel-Spezifisches – das
ist eine normale Next.js-Anwendung. Sagt die TNG-IT „kein US-Cloud", läuft dasselbe
Repository ohne Codeänderung auf einem internen Server oder im Docker-Container
(`npm run build && npm start`).
