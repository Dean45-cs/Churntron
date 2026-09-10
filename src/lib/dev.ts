/** Ist die Demo-Anzeige aktiv? Steuert Ladeverzoegerung und Demo-Hinweis. */
export const isSkeletonDemo = process.env.SKELETON_DEMO === '1'

/**
 * Kuenstliche Ladeverzoegerung, damit die Skeletons ueberhaupt sichtbar sind:
 * die Datenbank antwortet sonst in wenigen Millisekunden.
 *
 * Haengt allein an SKELETON_DEMO – bewusst auch in Produktion, weil die
 * oeffentliche Demo genau diese Ladezustaende zeigen soll. Solange die Variable
 * gesetzt ist, traegt die Topbar einen Demo-Hinweis, damit niemand die
 * Langsamkeit fuer echtes Verhalten haelt. In einer produktiven Umgebung mit
 * echten Daten hat SKELETON_DEMO nichts zu suchen (siehe DEPLOY.md).
 *
 * Aufruf am Anfang jeder datenabrufenden Server-Component.
 */
export async function devDelay(ms = 900) {
  if (!isSkeletonDemo) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
