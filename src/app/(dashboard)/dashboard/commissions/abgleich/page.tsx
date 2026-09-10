import { Suspense } from 'react'
import Link from 'next/link'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getPeriodenGruppen, getPeriodenPositionen, getPeriodenStaende } from '@/lib/queries'
import { AUSZAHLUNG_VERZUG_MONATE, STICHTAG } from '@/lib/period'
import { cn, formatEuro } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AbgleichSkeleton } from '@/components/skeletons/abgleich-skeleton'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { AbgleichPanel } from './abgleich-panel'

const PERIODEN_WIDTHS = ['w-28', 'w-36', 'w-24', 'w-24', 'w-24', 'w-20', 'w-24']

/**
 * Die Ueberpruefung: eingeben, was ausgezahlt wurde, und gegen die eigenen
 * Buchungen halten. Die gewaehlte Periode steht in der Adresse, damit sich ein
 * Fall verlinken laesst.
 */
export default async function AbgleichPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const nutzer = await nutzerOderAnmeldung()
  const wunsch = (await searchParams).periode

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>So läuft die Abrechnung</CardTitle>
          <CardDescription>
            Ein Abrechnungszeitraum läuft vom {STICHTAG}. eines Monats bis zum {STICHTAG - 1}. des
            Folgemonats und wird{' '}
            {AUSZAHLUNG_VERZUG_MONATE === 1
              ? 'eine Abrechnung'
              : `${AUSZAHLUNG_VERZUG_MONATE} Abrechnungen`}{' '}
            später ausgezahlt – „die Provision aus dem Monat davor, immer vom {STICHTAG}. zum{' '}
            {STICHTAG}.“. Abgerechnet wird danach, gearbeitet wird im Kalendermonat: deshalb steht
            er in der Tabelle daneben. Was zwischen dem {STICHTAG}. und dem Monatsende gebucht wird,
            zählt schon zum nächsten Abrechnungszeitraum – genau das ist der Unterschied zwischen
            den beiden Spalten. Stimmt der ausgezahlte Betrag mit den gebuchten Positionen überein,
            sind sie mit einem Klick erledigt. Weicht er ab, bleibt alles offen, bis klar ist,
            welche Position fehlt.
          </CardDescription>
        </CardHeader>
      </Card>

      <Suspense fallback={<TableSkeleton rows={6} widths={PERIODEN_WIDTHS} />}>
        <PeriodenTabelle userId={nutzer.id} gewaehlt={wunsch} />
      </Suspense>

      <div className="mt-6">
        <Suspense key={wunsch ?? 'aktuell'} fallback={<AbgleichSkeleton />}>
          <Detail userId={nutzer.id} gewaehlt={wunsch} />
        </Suspense>
      </div>
    </>
  )
}

/** Die zu pruefende Periode: die gewaehlte, sonst die juengste abgeschlossene. */
async function waehle(userId: string, gewaehlt?: string) {
  const staende = await getPeriodenStaende(userId, 6)
  const treffer = gewaehlt ? staende.find((s) => s.schluessel === gewaehlt) : undefined
  return { staende, stand: treffer ?? staende.find((s) => s.abgeschlossen) ?? staende[0]! }
}

async function PeriodenTabelle({ userId, gewaehlt }: { userId: string; gewaehlt?: string }) {
  await devDelay()
  const { staende, stand } = await waehle(userId, gewaehlt)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>Die letzten Abrechnungszeiträume</CardTitle>
        <CardDescription>
          Zum Prüfen eine Zeile auswählen. „Gebucht“ ist der Abrechnungszeitraum – die Spalte
          daneben zeigt denselben Monat vom 1. bis zum Monatsende.
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Monat</th>
              <th className="px-6 py-3 text-left font-semibold">Abrechnungszeitraum</th>
              <th className="px-6 py-3 text-right font-semibold">Gebucht</th>
              <th className="px-6 py-3 text-right font-semibold">Kalendermonat</th>
              <th className="px-6 py-3 text-right font-semibold">Ausgezahlt</th>
              <th className="px-6 py-3 text-right font-semibold">Differenz</th>
              <th className="px-6 py-3 text-left font-semibold">Stand</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {staende.map((s) => (
              <tr
                key={s.schluessel}
                className={cn(
                  'hover:bg-muted/30',
                  s.schluessel === stand.schluessel && 'bg-secondary/60',
                )}
              >
                <td className="px-6 py-3 font-medium">
                  <Link
                    href={`/dashboard/commissions/abgleich?periode=${s.schluessel}`}
                    className="hover:text-primary hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="text-muted-foreground tabular px-6 py-3 font-mono text-xs">
                  {s.zeitraum}
                </td>
                <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                  {formatEuro(s.erwartetCents)}
                </td>
                <td
                  className="text-muted-foreground tabular px-6 py-3 text-right font-mono"
                  title={`Kalendermonat ${s.monat.spanne}: ${s.monat.anzahl} Vorgänge`}
                >
                  {formatEuro(s.monat.summeCents)}
                </td>
                <td className="tabular px-6 py-3 text-right font-mono">
                  {s.ausgezahltCents === null ? '—' : formatEuro(s.ausgezahltCents)}
                </td>
                <td
                  className={cn(
                    'tabular px-6 py-3 text-right font-mono',
                    s.differenzCents ? 'text-accent font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {s.differenzCents === null
                    ? '—'
                    : s.differenzCents === 0
                      ? '0,00 €'
                      : `${s.differenzCents > 0 ? '+' : '−'} ${formatEuro(Math.abs(s.differenzCents))}`}
                </td>
                <td className="px-6 py-3">
                  {!s.abgeschlossen ? (
                    <Badge variant="accentSubtle">läuft noch</Badge>
                  ) : s.ausgezahltCents === null ? (
                    <Badge variant="outline">nicht geprüft</Badge>
                  ) : s.differenzCents === 0 ? (
                    <Badge variant="success">stimmt</Badge>
                  ) : (
                    <Badge variant="destructive">Differenz</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

async function Detail({ userId, gewaehlt }: { userId: string; gewaehlt?: string }) {
  await devDelay(1500)
  const { stand } = await waehle(userId, gewaehlt)
  const [gruppen, positionen] = await Promise.all([
    getPeriodenGruppen(userId, stand.schluessel),
    getPeriodenPositionen(userId, stand.schluessel),
  ])

  return <AbgleichPanel stand={stand} gruppen={gruppen} positionen={positionen} />
}
