/**
 * Wie eine Einwandbehandlung im Gespraech gelesen wird.
 *
 * Im Telefonat wird nicht gelesen, sondern gesprochen – und zwar sofort. Ein
 * Absatz Fliesstext ist dafuer zu langsam: bis das Auge die Stelle gefunden
 * hat, an der es weitergeht, ist die Pause schon peinlich. Deshalb hat ein
 * Eintrag eine Form:
 *
 *   Zeile 1  – der Einstiegssatz. Was jetzt gesagt wird, woertlich.
 *   Zeile 2+ – ein Gedanke pro Zeile. Das sind die Punkte, die tragen.
 *
 * Die Form kommt von der Person, die den Eintrag schreibt; erfunden wird hier
 * nichts. Wer einen langen Absatz eintippt, bekommt einen langen Absatz
 * angezeigt – Struktur, die niemand gemeint hat, waere im Gespraech
 * schlimmer als gar keine.
 */

/** Ab hier ist eine Zeile kein Satz mehr, den man am Stueck vorliest. */
const EINSTIEG_MAX = 220

export type Antwortteile = {
  /** Der Satz, mit dem das Gespraech weitergeht. Fehlt bei Fliesstext. */
  einstieg: string | null
  /** Ein Gedanke je Eintrag. Bei einem einzigen Eintrag bleibt es ein Absatz. */
  punkte: string[]
}

export function zerlegeAntwort(answer: string): Antwortteile {
  const zeilen = answer
    .split('\n')
    .map((z) => z.trim())
    .filter(Boolean)

  const [erste, ...rest] = zeilen
  if (!erste) return { einstieg: null, punkte: [] }

  // Ein Absatz als erste Zeile ist kein Einstiegssatz, sondern Fliesstext.
  if (erste.length > EINSTIEG_MAX) return { einstieg: null, punkte: zeilen }

  return { einstieg: erste, punkte: rest }
}

/**
 * Der Eintrag als Text zum Weitergeben – fuer die Zwischenablage, wenn jemand
 * die Formulierung in die Gespraechsnotiz oder den Chat uebernimmt.
 */
export function alsText(eintrag: { title: string; answer: string; followUp?: string | null }) {
  const teile = [eintrag.title, '', eintrag.answer]
  if (eintrag.followUp) teile.push('', eintrag.followUp)
  return teile.join('\n')
}
