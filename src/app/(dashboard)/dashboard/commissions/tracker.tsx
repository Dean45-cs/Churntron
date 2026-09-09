'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, Loader2, Undo2 } from 'lucide-react'
import type { KatalogGruppe, TrackerStand } from '@/lib/queries'
import { COMMISSION_CATEGORY_LABEL, COMMISSION_CATEGORY_SHORT } from '@/lib/labels'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { CommissionStatusBadge } from '@/components/status-badge'
import { StatCard } from '@/components/stat-card'
import { ZeitraumVergleich } from '@/components/zeitraum-vergleich'
import { STICHTAG } from '@/lib/period'
import { cn, formatEuro } from '@/lib/utils'
import { buchen, buchungZuruecknehmen } from './actions'

/**
 * Der Tracker. Eine Taste, eine Buchung – mehr soll es waehrend der Schicht
 * nicht sein.
 *
 * Warum das Ganze optimistisch laeuft: zwischen Tastendruck und Antwort des
 * Servers liegt eine Netzrunde. Wer 40 Welcome Calls am Tag bucht, tippt in der
 * Zeit schon die naechste Taste – also zeigt die Oberflaeche den Zaehler sofort
 * und korrigiert sich, falls der Server widerspricht.
 */

type Wartend = { id: number; key: string; bezeichnung: string; amountCents: number }

export function Tracker({ gruppen, stand }: { gruppen: KatalogGruppe[]; stand: TrackerStand }) {
  const [aktiveGruppe, setAktiveGruppe] = useState(gruppen[0]?.kategorie ?? 'CAMPAIGN')
  const [referenz, setReferenz] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [wartend, merkeVor] = useOptimistic<Wartend[], Wartend>([], (liste, neu) => [neu, ...liste])

  const gruppe = gruppen.find((g) => g.kategorie === aktiveGruppe) ?? gruppen[0]

  const wartendeSumme = wartend.reduce((s, w) => s + w.amountCents, 0)
  const zaehler = (key: string) =>
    (stand.heuteJeRegel[key] ?? 0) + wartend.filter((w) => w.key === key).length

  function tippen(eintrag: KatalogGruppe['eintraege'][number]) {
    setFehler(null)
    const ref = referenz.trim()

    startTransition(async () => {
      merkeVor({
        id: Date.now() + Math.random(),
        key: eintrag.key,
        bezeichnung: eintrag.variant ? `${eintrag.name} · ${eintrag.variant}` : eintrag.name,
        amountCents: eintrag.amountCents,
      })
      const ergebnis = await buchen({ key: eintrag.key, externalRef: ref || null })
      if (!ergebnis.ok) setFehler(ergebnis.fehler)
      // Die Vertragsnummer gehoert zu genau einem Vorgang – danach ist sie weg.
      else if (ref) setReferenz('')
    })
  }

  function zuruecknehmen(id: string) {
    setFehler(null)
    startTransition(async () => {
      const ergebnis = await buchungZuruecknehmen(id)
      if (!ergebnis.ok) setFehler(ergebnis.fehler)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Heute"
          value={formatEuro(stand.heute.summeCents + wartendeSumme)}
          hint={`${stand.heute.anzahl + wartend.length} Vorgänge`}
          accent
        />
        <StatCard
          label="Diese Woche"
          value={formatEuro(stand.woche.summeCents + wartendeSumme)}
          hint={`${stand.woche.anzahl + wartend.length} Vorgänge`}
        />
        <StatCard
          label="Noch nicht ausgezahlt"
          value={formatEuro(stand.offenCents)}
          hint="über alle Abrechnungszeiträume"
        />
      </div>

      {/* Beide Zuschnitte, immer zusammen: eine frische Buchung zaehlt in
          beiden mit, also wandert die offene Summe auch in beide. */}
      <ZeitraumVergleich
        zeitraeume={[
          {
            ...stand.monat,
            summeCents: stand.monat.summeCents + wartendeSumme,
            anzahl: stand.monat.anzahl + wartend.length,
          },
          {
            ...stand.periode,
            summeCents: stand.periode.summeCents + wartendeSumme,
            anzahl: stand.periode.anzahl + wartend.length,
          },
        ]}
        fussnote={
          <>
            Dieselben Buchungen, zwei Zuschnitte: der Kalendermonat zählt vom 1. bis zum Monatsende,
            der Abrechnungszeitraum vom {STICHTAG}. bis zum {STICHTAG - 1}. des Folgemonats.
            Abgerechnet wird der zweite.
          </>
        }
      />

      <Card>
        <CardHeader className="border-border flex-row flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle>Vorgang buchen</CardTitle>
            <CardDescription>
              Ein Tastendruck ist eine Buchung. Der Betrag kommt aus dem Katalog.
            </CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Input
              value={referenz}
              onChange={(e) => setReferenz(e.target.value)}
              placeholder="Vertragsnummer (optional)"
              aria-label="Vertragsnummer für die nächste Buchung"
              className="h-10 font-mono text-sm"
            />
          </div>
        </CardHeader>

        <div className="border-border flex gap-1 overflow-x-auto border-b px-4 py-2">
          {gruppen.map((g) => (
            <button
              key={g.kategorie}
              type="button"
              onClick={() => setAktiveGruppe(g.kategorie)}
              aria-pressed={g.kategorie === aktiveGruppe}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                g.kategorie === aktiveGruppe
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              {COMMISSION_CATEGORY_SHORT[g.kategorie]}
            </button>
          ))}
        </div>

        <div className="p-4">
          <p className="text-muted-foreground mb-3 px-1 text-xs font-semibold tracking-wide uppercase">
            {gruppe ? COMMISSION_CATEGORY_LABEL[gruppe.kategorie] : ''}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {gruppe?.eintraege.map((eintrag) => {
              const anzahl = zaehler(eintrag.key)
              // Der Katalog kennt einen Fall ohne Anspruch. Er bleibt sichtbar,
              // damit die Regel im Tracker steht – aber er laesst sich nicht buchen.
              const ohneAnspruch = eintrag.amountCents === 0

              return (
                <button
                  key={eintrag.key}
                  type="button"
                  disabled={ohneAnspruch}
                  onClick={() => tippen(eintrag)}
                  className={cn(
                    'group border-border bg-card relative flex min-h-[72px] flex-col justify-center gap-0.5 rounded-2xl border px-4 py-3 text-left transition-all',
                    ohneAnspruch
                      ? 'cursor-not-allowed opacity-55'
                      : 'hover:border-primary hover:bg-secondary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]',
                  )}
                >
                  <span className="pr-8 text-sm leading-tight font-semibold">{eintrag.name}</span>
                  {eintrag.variant ? (
                    <span className="text-muted-foreground text-xs">{eintrag.variant}</span>
                  ) : null}
                  <span
                    className={cn(
                      'tabular mt-1 font-mono text-sm font-semibold',
                      ohneAnspruch ? 'text-muted-foreground' : 'text-accent',
                    )}
                  >
                    {ohneAnspruch ? 'keine Provision' : formatEuro(eintrag.amountCents)}
                  </span>

                  {anzahl > 0 ? (
                    <span className="bg-primary text-primary-foreground tabular absolute top-3 right-3 grid h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-xs font-bold">
                      {anzahl}×
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {fehler ? (
            <p role="alert" className="text-destructive mt-4 text-sm font-medium">
              {fehler}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-border flex-row items-center justify-between border-b pb-4">
          <CardTitle>Zuletzt gebucht</CardTitle>
          <span className="text-muted-foreground text-sm">
            Auszahlung des Abrechnungszeitraums am{' '}
            <span className="tabular font-mono">{stand.periode.auszahlungAm}</span>
          </span>
        </CardHeader>

        <ul className="divide-border divide-y">
          {wartend.map((w) => (
            <li key={w.id} className="text-muted-foreground flex items-center gap-3 px-6 py-3">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              <span className="flex-1 text-sm">{w.bezeichnung}</span>
              <span className="tabular font-mono text-sm">{formatEuro(w.amountCents)}</span>
            </li>
          ))}

          {stand.letzteBuchungen.map((b) => (
            <li
              key={b.id}
              className="hover:bg-muted/30 flex flex-wrap items-center gap-3 px-6 py-3"
            >
              <Check className="text-success size-4 shrink-0" />
              <span className="text-muted-foreground tabular w-12 font-mono text-xs">
                {b.uhrzeit}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">{b.bezeichnung}</span>
              {b.externalRef ? (
                <Badge variant="outline" className="font-mono">
                  {b.externalRef}
                </Badge>
              ) : null}
              <CommissionStatusBadge status={b.status} />
              <span className="tabular w-20 text-right font-mono text-sm font-semibold">
                {formatEuro(b.amountCents)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Buchung zurücknehmen"
                aria-label={`Buchung ${b.bezeichnung} zurücknehmen`}
                onClick={() => zuruecknehmen(b.id)}
              >
                <Undo2 />
              </Button>
            </li>
          ))}

          {stand.letzteBuchungen.length === 0 && wartend.length === 0 ? (
            <li className="text-muted-foreground px-6 py-10 text-center text-sm">
              Noch nichts gebucht. Die erste Taste oben legt los.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  )
}
