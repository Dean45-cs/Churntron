# Churntron online stellen

Ziel: eine öffentlich erreichbare Demo, die du deinem Ausbilder per Link zeigen kannst,
ohne dass jemand etwas installieren muss.

**Was hier online geht, sind ausschließlich erfundene Daten** – Fantasie-Vertragsnummern
und sechs ausgedachte Kolleginnen und Kollegen aus dem Seed. Deshalb ist diese Demo
datenschutzrechtlich unkritisch. Lies trotzdem den Abschnitt
[Bevor echte Daten drauf dürfen](#bevor-echte-daten-drauf-dürfen) am Ende.

Du brauchst zwei kostenlose Konten: **Neon** (Datenbank) und **Vercel** (Hosting).
Beides geht mit GitHub-Login. Rechne mit 15 Minuten.

---

## 1. Datenbank anlegen (Neon)

1. Auf [neon.com](https://neon.com) anmelden und ein neues Projekt anlegen.
2. Als Region **Europe (Frankfurt) – eu-central-1** wählen. Wichtig: damit liegen die
   Daten in der EU.
3. Den **Connection String** kopieren. Er sieht so aus:
   `postgresql://benutzer:passwort@ep-irgendwas.eu-central-1.aws.neon.tech/neondb?sslmode=require`

Leg ihn kurz beiseite, du brauchst ihn gleich zweimal.

## 2. Ein Secret erzeugen

NextAuth signiert damit die Sitzungen. Erzeuge dir einen zufälligen Wert:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Das Ergebnis kommt gleich als `AUTH_SECRET` in die Umgebungsvariablen. **Nimm nicht den
Wert aus `.env.example`** – der steht öffentlich im Repository.

## 3. Bei Vercel importieren

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden.
2. **Add New → Project** und das Repository `Dean45-cs/Churntron` auswählen.
3. Als **Branch** `claude/vertriebs-tool-tng-plan-im91wm` wählen, solange der Pull Request
   noch nicht gemergt ist.
4. Unter **Environment Variables** diese vier eintragen:

   | Name            | Wert                                        |
   | --------------- | ------------------------------------------- |
   | `DATABASE_URL`  | der Connection String aus Schritt 1         |
   | `AUTH_SECRET`   | der erzeugte Wert aus Schritt 2             |
   | `DEMO_PASSWORD` | ein Passwort deiner Wahl, z. B. `churntron` |
   | `SKELETON_DEMO` | `1`                                         |

5. **Deploy** klicken.

`SKELETON_DEMO=1` macht die Ladezustände sichtbar (die Datenbank wäre sonst zu schnell)
und blendet oben den Hinweis „Demo · erfundene Daten" ein. Genau das willst du beim
Vorführen. In einer produktiven Umgebung mit echten Daten hat die Variable nichts zu
suchen.

Das Deployment wandert dank `vercel.json` nach **Frankfurt (fra1)**, und `vercel-build`
legt die Tabellen beim Deployen automatisch an.

## 4. Demo-Daten einspielen

Die Tabellen sind nach dem Deploy da, aber leer. Einmalig vom eigenen Rechner aus füllen:

```bash
DATABASE_URL="<dein Neon-String>" npm run db:seed
```

Danach die Vercel-URL öffnen und mit `rep@tng.de` oder `admin@tng.de` anmelden –
Passwort ist der Wert, den du als `DEMO_PASSWORD` gesetzt hast.

> Der Seed **löscht vorher alles** in der Datenbank. Solange dort nur Demo-Daten liegen,
> ist das gewollt.

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
