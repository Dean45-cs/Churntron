/**
 * Kuenstliche Ladeverzoegerung, damit die Skeletons im Alltag ueberhaupt
 * sichtbar sind: der lokale Postgres antwortet in wenigen Millisekunden.
 *
 * Nur aktiv, wenn SKELETON_DEMO=1 gesetzt ist – in Produktion also nie.
 * Aufruf am Anfang jeder datenabrufenden Server-Component.
 */
export async function devDelay(ms = 900) {
  if (process.env.SKELETON_DEMO !== '1') return
  if (process.env.NODE_ENV === 'production') return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
