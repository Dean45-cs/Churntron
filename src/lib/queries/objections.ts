import type { ObjectionCategory } from '@prisma/client'
import { db } from '@/lib/db'
import { OBJECTION_CATEGORY_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/utils'

/**
 * Abfragen der Einwand-Wiki.
 *
 * Die Wiki wird am Stueck geladen und im Browser durchsucht. Das ist Absicht:
 * gesucht wird waehrend eines Telefonats, und da zaehlt jede Zehntelsekunde
 * zwischen Tastendruck und Treffer mehr als ein sparsamer Datentransfer. Ein
 * paar hundert Eintraege sind ein paar hundert Kilobyte – ab da lohnt der
 * Umbau auf eine Server Action, und die Bewertung in
 * src/lib/objection-search.ts bleibt dabei unveraendert.
 *
 * Die Zeitangabe wird hier formatiert und nicht in der Komponente: im
 * Render-Pfad hat kein Date.now() etwas zu suchen.
 */

export type WikiEintrag = {
  id: string
  title: string
  category: ObjectionCategory
  kategorieLabel: string
  variants: string[]
  answer: string
  followUp: string | null
  tags: string[]
  helpful: number
  archived: boolean
  autor: string | null
  /** Aus dem Startbestand (src/lib/objection-catalog.ts) statt selbst angelegt. */
  ausStartbestand: boolean
  geaendertAm: string
}

/**
 * Alle sichtbaren Eintraege. Die Reihenfolge ist die des ungefilterten
 * Blaetterns: was sich im Gespraech bewaehrt hat, zuerst.
 */
export async function getEinwaende(mitArchiv = false): Promise<WikiEintrag[]> {
  const eintraege = await db.objection.findMany({
    where: mitArchiv ? {} : { archived: false },
    orderBy: [{ helpful: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      key: true,
      title: true,
      category: true,
      variants: true,
      answer: true,
      followUp: true,
      tags: true,
      helpful: true,
      archived: true,
      updatedAt: true,
      author: { select: { displayName: true } },
    },
  })

  return eintraege.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    kategorieLabel: OBJECTION_CATEGORY_LABEL[e.category],
    variants: e.variants,
    answer: e.answer,
    followUp: e.followUp,
    tags: e.tags,
    helpful: e.helpful,
    archived: e.archived,
    autor: e.author?.displayName ?? null,
    ausStartbestand: e.key !== null,
    geaendertAm: formatDate(e.updatedAt),
  }))
}

export async function getWikiKennzahlen() {
  const [gesamt, archiviert, themen, bewaehrt] = await Promise.all([
    db.objection.count({ where: { archived: false } }),
    db.objection.count({ where: { archived: true } }),
    db.objection.groupBy({
      by: ['category'],
      where: { archived: false },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    }),
    db.objection.findFirst({
      where: { archived: false, helpful: { gt: 0 } },
      orderBy: { helpful: 'desc' },
      select: { title: true, helpful: true },
    }),
  ])

  return {
    gesamt,
    archiviert,
    themenAnzahl: themen.length,
    haeufigstesThema: themen[0]
      ? { label: OBJECTION_CATEGORY_LABEL[themen[0].category], anzahl: themen[0]._count }
      : null,
    bewaehrt,
  }
}
