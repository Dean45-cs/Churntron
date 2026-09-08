'use client'

import { useState, useTransition } from 'react'
import { CheckCheck, ScanSearch } from 'lucide-react'
import type { CommissionStatus } from '@prisma/client'
import type { PeriodenPosition, PeriodenStand } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { CommissionStatusBadge } from '@/components/status-badge'
import { cn, centsAlsEingabe, formatEuro } from '@/lib/utils'
import { auszahlungPruefen, periodeAbhaken, statusSetzen } from '../actions'

/**
 * Der Abgleich: eingeben, was tatsaechlich ueberwiesen wurde, und sehen, ob es
 * zu dem passt, was gebucht ist.
 *
 * Stimmt es auf den Cent, sind alle Positionen der Periode mit einem Klick
 * erledigt. Stimmt es nicht, bleibt alles offen – dann ist die Gruppentabelle
 * darunter die Arbeitsflaeche: dort faellt auf, wo eine Stueckzahl fehlt.
 */

export type Gruppe = {
  bezeichnung: string
  satzCents: number
  anzahl: number
  summeCents: number
  stornoAnzahl: number
}

export function AbgleichPanel({
  stand,
  gruppen,
  positionen,
  zeitraum,
}: {
  stand: PeriodenStand
  gruppen: Gruppe[]
  positionen: PeriodenPosition[]
  zeitraum: string
}) {
  const [hinweis, setHinweis] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function pruefen(formData: FormData) {
    startTransition(async () => {
      const r = await auszahlungPruefen(formData)
      setHinweis(
        r.ok ? { ok: true, text: r.hinweis ?? 'Gespeichert.' } : { ok: false, text: r.fehler },
      )
    })
  }

  function abhaken() {
    startTransition(async () => {
      const r = await periodeAbhaken(stand.schluessel)
      setHinweis(r.ok ? { ok: true, text: r.hinweis ?? '' } : { ok: false, text: r.fehler })
    })
  }

  function status(id: string, neu: CommissionStatus) {
    startTransition(async () => {
      const r = await statusSetzen(id, neu)
      if (!r.ok) setHinweis({ ok: false, text: r.fehler })
    })
  }

  const differenz = stand.differenzCents
  const offeneListe = positionen.filter((p) => p.status !== 'PAID')

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Auszahlung prüfen</CardTitle>
          <CardDescription>
            Periode {zeitraum} · voraussichtliche Auszahlung am{' '}
            <span className="tabular font-mono">{stand.auszahlungAmText}</span>
          </CardDescription>
        </CardHeader>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form action={pruefen} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="periode" value={stand.schluessel} />

            <Field label="Ausgezahlt bekommen (€)">
              <Input
                name="betrag"
                inputMode="decimal"
                required
                defaultValue={
                  stand.ausgezahltCents !== null ? centsAlsEingabe(stand.ausgezahltCents) : ''
                }
                placeholder={centsAlsEingabe(stand.erwartetCents)}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Am" hint="Optional.">
              <Input
                name="datum"
                type="date"
                defaultValue={stand.bezahltAmWert ?? ''}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Notiz" hint="Optional, z. B. eine Rückfrage.">
              <Input name="notiz" defaultValue={stand.notiz ?? ''} maxLength={280} />
            </Field>

            <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
              <Button type="submit" disabled={pending}>
                <ScanSearch />
                {pending ? 'Wird geprüft …' : 'Prüfen'}
              </Button>
              {stand.offenAnzahl > 0 ? (
                <Button type="button" variant="outline" onClick={abhaken} disabled={pending}>
                  <CheckCheck />
                  {stand.offenAnzahl} offene Positionen abhaken
                </Button>
              ) : null}
            </div>

            {hinweis ? (
              <p
                role="status"
                className={cn(
                  'text-sm font-medium sm:col-span-3',
                  hinweis.ok ? 'text-success' : 'text-destructive',
                )}
              >
                {hinweis.text}
              </p>
            ) : null}
          </form>

          <div className="border-border flex flex-col gap-2 rounded-2xl border p-5">
            <Zeile label="Gebucht" wert={formatEuro(stand.erwartetCents)} />
            <Zeile
              label="Ausgezahlt"
              wert={stand.ausgezahltCents === null ? '—' : formatEuro(stand.ausgezahltCents)}
            />
            <div className="border-border mt-1 border-t pt-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Differenz
              </p>
              <p
                className={cn(
                  'tabular mt-1 font-mono text-2xl font-semibold',
                  differenz === null
                    ? 'text-muted-foreground'
                    : differenz === 0
                      ? 'text-success'
                      : 'text-accent',
                )}
              >
                {differenz === null
                  ? 'noch nicht geprüft'
                  : differenz === 0
                    ? 'stimmt'
                    : `${differenz > 0 ? '+' : '−'} ${formatEuro(Math.abs(differenz))}`}
              </p>
              {stand.stornoCents > 0 ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatEuro(stand.stornoCents)} storniert – nicht mitgerechnet.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Positionen nach Katalogeintrag</CardTitle>
          <CardDescription>
            Die Ansicht für den Vergleich mit der Abrechnung: Stückzahl mal Satz.
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Position</th>
                <th className="px-6 py-3 text-right font-semibold">Satz</th>
                <th className="px-6 py-3 text-right font-semibold">Anzahl</th>
                <th className="px-6 py-3 text-right font-semibold">Storniert</th>
                <th className="px-6 py-3 text-right font-semibold">Summe</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {gruppen.map((g) => (
                <tr key={g.bezeichnung} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{g.bezeichnung}</td>
                  <td className="text-muted-foreground tabular px-6 py-3 text-right font-mono">
                    {formatEuro(g.satzCents)}
                  </td>
                  <td className="tabular px-6 py-3 text-right font-mono">{g.anzahl}</td>
                  <td className="text-muted-foreground tabular px-6 py-3 text-right font-mono">
                    {g.stornoAnzahl > 0 ? g.stornoAnzahl : '—'}
                  </td>
                  <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                    {formatEuro(g.summeCents)}
                  </td>
                </tr>
              ))}
              {gruppen.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-6 py-10 text-center">
                    In dieser Periode wurde nichts gebucht.
                  </td>
                </tr>
              ) : (
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-6 py-3">Summe</td>
                  <td />
                  <td className="tabular px-6 py-3 text-right font-mono">{stand.anzahl}</td>
                  <td />
                  <td className="tabular px-6 py-3 text-right font-mono">
                    {formatEuro(stand.erwartetCents)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {offeneListe.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader className="border-border border-b pb-4">
            <CardTitle>Noch nicht ausgezahlt</CardTitle>
            <CardDescription>
              Fehlt eine Position in der Abrechnung, kann sie hier als storniert vermerkt werden –
              dann stimmt die Summe beim nächsten Prüfen.
            </CardDescription>
          </CardHeader>
          <ul className="divide-border max-h-[420px] divide-y overflow-y-auto">
            {offeneListe.map((p) => (
              <li
                key={p.id}
                className="hover:bg-muted/30 flex flex-wrap items-center gap-3 px-6 py-2.5"
              >
                <span className="text-muted-foreground tabular w-20 font-mono text-xs">
                  {p.tagText}
                </span>
                <span className="min-w-0 flex-1 text-sm">{p.bezeichnung}</span>
                {p.externalRef ? (
                  <span className="text-muted-foreground font-mono text-xs">{p.externalRef}</span>
                ) : null}
                <CommissionStatusBadge status={p.status} />
                <span className="tabular w-20 text-right font-mono text-sm font-semibold">
                  {formatEuro(p.amountCents)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => status(p.id, 'PAID')}
                  >
                    bezahlt
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => status(p.id, 'CLAWBACK')}
                  >
                    storniert
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

function Zeile({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="tabular font-mono text-sm font-semibold">{wert}</span>
    </div>
  )
}
