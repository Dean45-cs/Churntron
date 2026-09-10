import { Suspense } from 'react'
import { devDelay } from '@/lib/dev'
import { getKatalog } from '@/lib/queries'
import { CATALOG_CONDITIONS, CATALOG_VERSION } from '@/lib/commission-catalog'
import { COMMISSION_CATEGORY_LABEL } from '@/lib/labels'
import { formatEuro } from '@/lib/utils'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'

const KATALOG_WIDTHS = ['w-44', 'w-32', 'w-20']

/**
 * Der Katalog zum Nachschlagen. Er kommt aus der Datenbank und nicht aus dem
 * Code – die Saetze werden beim Seed aus src/lib/commission-catalog.ts
 * geschrieben und lassen sich dort in einer Zeile aendern.
 */
export default function KatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          {[7, 13, 5].map((rows) => (
            <TableSkeleton key={rows} rows={rows} widths={KATALOG_WIDTHS} />
          ))}
        </div>
      }
    >
      <Katalog />
    </Suspense>
  )
}

async function Katalog() {
  await devDelay()
  const gruppen = await getKatalog()

  return (
    <div className="flex flex-col gap-6">
      {gruppen.map((g) => (
        <Card key={g.kategorie} className="overflow-hidden">
          <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
            <CardTitle>{COMMISSION_CATEGORY_LABEL[g.kategorie]}</CardTitle>
            <span className="text-muted-foreground text-sm">{g.eintraege.length} Sätze</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Leistung</th>
                  <th className="px-6 py-3 text-left font-semibold">Bedingung</th>
                  <th className="px-6 py-3 text-right font-semibold">Auszahlung</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {g.eintraege.map((e) => (
                  <tr key={e.key} className="hover:bg-muted/30">
                    <td className="px-6 py-3 font-medium">{e.name}</td>
                    <td className="text-muted-foreground px-6 py-3">
                      {e.variant ?? '—'}
                      {e.hint ? <span className="block text-xs">{e.hint}</span> : null}
                    </td>
                    <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                      {e.amountCents > 0 ? formatEuro(e.amountCents) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Voraussetzungen</CardTitle>
          <CardDescription>
            Aus dem Provisionskatalog der TNG Stadtnetz GmbH, Version {CATALOG_VERSION}. Ohne diese
            Punkte entsteht kein Anspruch – auch wenn die Buchung hier steht.
          </CardDescription>
        </CardHeader>
        <ul className="text-muted-foreground flex list-disc flex-col gap-2 px-6 pb-6 pl-11 text-sm">
          {CATALOG_CONDITIONS.map((bedingung) => (
            <li key={bedingung}>{bedingung}</li>
          ))}
          <li>
            Bei einem Wechsel des Arbeitsplatzes, durch den diese Voraussetzungen nicht mehr
            vollständig erfüllt sind, entfallen die Provisionsansprüche ab dem Datum der
            Veränderung.
          </li>
        </ul>
      </Card>
    </div>
  )
}
