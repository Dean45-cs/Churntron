/**
 * Die einheitliche Antwort aller Server Actions.
 *
 * Kein Werfen bei Fachfehlern: ein zu kurzes Passwort oder ein zu grosses Bild
 * ist kein Ausnahmezustand, sondern etwas, das im Formular stehen soll. Geworfen
 * wird nur, was wirklich nicht sein darf – eine fehlende Anmeldung etwa.
 */
export type ActionErgebnis = { ok: true; hinweis?: string } | { ok: false; fehler: string }
