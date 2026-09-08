import { Suspense } from 'react'
import Link from 'next/link'
import { nutzerOderAnmeldung } from '@/lib/session'
import { devDelay } from '@/lib/dev'
import { getStatusStaende, getTeamProvisionen, getVerdienst } from '@/lib/queries'
import { FENSTER_LABEL, type Fenster } from '@/lib/earnings'
import { COMMISSION_CATEGORY_LABEL } from '@/lib/labels'
import { cn, formatEuro, formatProzent, formatZahl } from '@/lib/utils'
import { StatCard } from '@/components/stat-card'
import { StatCardGridSkeleton } from '@/components/skeletons/stat-card-skeleton'
import { AnteilsBalken, MonatsSaeulen } from '@/components/bar-series'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableSkeleton } from '@/components/skeletons/table-skeleton'
import { VerdienstSkeleton } from '@/components/skeletons/verdienst-skeleton'

const FENSTER: Fenster[] = ['30', '90', 'jahr', 'alles']
const TEAM_WIDTHS = ['w-32', 'w-24', 'w-20', 'w-24']

/**
 * Die Auswertung: was kommt pro Tag, pro Woche, pro Monat, pro Quartal, pro Jahr
 * und pro Stunde herum. Der Bezugszeitraum steht in der Adresse (?fenster=90),
 * damit die Auswahl teilbar und ohne Client-JavaScript umschaltbar bleibt.
 */
export default async function VerdienstPage({
  searchParams,
}: {
  searchParams: Promise<{ fenster?: string }>
}) {
  const nutzer = await nutzerOderAnmeldung()
  const isAdmin = nutzer.role === 'ADMIN'
  const wunsch = (await searchParams).fenster
  const fenster: Fenster = FENSTER.includes(wunsch as Fenster) ? (wunsch as Fenster) : '90'

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground mr-1 text-sm">Bezugszeitraum:</span>
        {FENSTER.map((f) => (
          <Link
            key={f}
            href={`/dashboard/commissions/verdienst?fenster=${f}`}
            aria-current={f === fenster ? 'true' : undefined}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              f === fenster
                ? 'bg-primary text-primary-foreground'
                : 'border-border hover:bg-secondary border',
            )}
          >
            {FENSTER_LABEL[f]}
          </Link>
        ))}
      </div>

      <Suspense key={fenster} fallback={<VerdienstSkeleton />}>
        <Auswertung userId={nutzer.id} fenster={fenster} />
      </Suspense>

      {/* Laedt fuer sich: die Statusuebersicht haengt nicht am Bezugszeitraum. */}
      <div className="mt-6">
        <Suspense fallback={<StatCardGridSkeleton />}>
          <StatusUebersicht userId={nutzer.id} />
        </Suspense>
      </div>

      {isAdmin ? (
        <div className="mt-6">
          <Suspense fallback={<TableSkeleton rows={6} widths={TEAM_WIDTHS} />}>
            <TeamUebersicht />
          </Suspense>
        </div>
      ) : null}
    </>
  )
}

async function Auswertung({ userId, fenster }: { userId: string; fenster: Fenster }) {
  await devDelay()
  const { auswertung: a, profil } = await getVerdienst(userId, fenster)

  const schnittZeilen = [
    {
      label: 'Pro Stunde',
      brutto: a.schnitt.proStunde,
      netto: a.schnittNetto.proStunde,
      basis: `${formatZahl(a.fenster.stunden)} Std. bei ${formatZahl(profil.wochenstunden, 1)} h/Woche`,
    },
    {
      label: 'Pro Arbeitstag',
      brutto: a.schnitt.proArbeitstag,
      netto: a.schnittNetto.proArbeitstag,
      basis: `${formatZahl(a.fenster.arbeitstage)} Tage bei ${profil.arbeitstageProWoche} Tagen/Woche`,
    },
    {
      label: 'Pro Buchungstag',
      brutto: a.schnitt.proBuchungstag,
      netto: a.schnittNetto.proBuchungstag,
      basis: `${a.fenster.buchungsTage} Tage mit mindestens einer Buchung`,
    },
    {
      label: 'Pro Kalendertag',
      brutto: a.schnitt.proKalendertag,
      netto: a.schnittNetto.proKalendertag,
      basis: `${a.fenster.kalenderTage} Tage im Zeitraum`,
    },
    { label: 'Pro Woche', brutto: a.schnitt.proWoche, netto: a.schnittNetto.proWoche, basis: '' },
    { label: 'Pro Monat', brutto: a.schnitt.proMonat, netto: a.schnittNetto.proMonat, basis: '' },
    {
      label: 'Pro Quartal',
      brutto: a.schnitt.proQuartal,
      netto: a.schnittNetto.proQuartal,
      basis: 'hochgerechnet',
    },
    {
      label: 'Pro Jahr',
      brutto: a.schnitt.proJahr,
      netto: a.schnittNetto.proJahr,
      basis: 'hochgerechnet',
    },
  ]

  const gesamtImFenster = Math.max(1, a.fenster.summeCents)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Heute"
          value={formatEuro(a.zeitraeume.heute.summeCents)}
          hint={`${a.zeitraeume.heute.anzahl} Vorgänge`}
          accent
        />
        <StatCard
          label="Diese Woche"
          value={formatEuro(a.zeitraeume.woche.summeCents)}
          hint={`${a.zeitraeume.woche.anzahl} Vorgänge`}
        />
        <StatCard
          label="Dieser Monat"
          value={formatEuro(a.zeitraeume.monat.summeCents)}
          hint={`${a.zeitraeume.monat.anzahl} Vorgänge`}
        />
        <StatCard
          label="Dieses Quartal"
          value={formatEuro(a.zeitraeume.quartal.summeCents)}
          hint={`${a.zeitraeume.quartal.anzahl} Vorgänge`}
        />
        <StatCard
          label="Dieses Jahr"
          value={formatEuro(a.zeitraeume.jahr.summeCents)}
          hint={`${a.zeitraeume.jahr.anzahl} Vorgänge`}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Schnitt im Bezugszeitraum</CardTitle>
          <CardDescription>
            {FENSTER_LABEL[a.fenster.art]} · {formatEuro(a.fenster.summeCents)} aus{' '}
            {a.fenster.anzahl} Vorgängen
            {a.fenster.stornoAnzahl > 0
              ? ` · ${a.fenster.stornoAnzahl} storniert (${formatEuro(a.fenster.stornoCents)}), nicht mitgezählt`
              : ''}
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Einheit</th>
                <th className="px-6 py-3 text-right font-semibold">Brutto</th>
                <th className="px-6 py-3 text-right font-semibold">Netto (geschätzt)</th>
                <th className="hidden px-6 py-3 text-left font-semibold sm:table-cell">
                  Grundlage
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {schnittZeilen.map((z) => (
                <tr key={z.label} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{z.label}</td>
                  <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                    {formatEuro(z.brutto)}
                  </td>
                  <td className="text-muted-foreground tabular px-6 py-3 text-right font-mono">
                    {formatEuro(z.netto)}
                  </td>
                  <td className="text-muted-foreground hidden px-6 py-3 text-xs sm:table-cell">
                    {z.basis}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground border-border border-t px-6 py-3 text-xs">
          Netto ist eine Schätzung: {formatProzent(a.netto.quote)} der Provision bleiben bei einem
          Grundgehalt von {formatEuro(profil.grundgehaltCents)} und Steuerklasse{' '}
          {profil.steuerklasse} übrig. Die Angaben stehen im Reiter „Brutto / Netto“.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Provision je Monat</CardTitle>
            <CardDescription>Letzte zwölf Monate, ohne stornierte Vorgänge.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            {a.jeMonat.length > 0 ? (
              <MonatsSaeulen
                daten={a.jeMonat.map((m, i) => ({
                  label: m.label,
                  wert: m.summeCents,
                  hinweis: formatEuro(m.summeCents),
                  hervorheben: i === a.jeMonat.length - 1,
                }))}
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Noch keine Buchungen.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Woher der Verdienst kommt</CardTitle>
            <CardDescription>Abschnitte des Katalogs im Bezugszeitraum.</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            {a.jeKategorie.length > 0 ? (
              <AnteilsBalken
                daten={a.jeKategorie.map((k) => ({
                  label: COMMISSION_CATEGORY_LABEL[k.kategorie],
                  wert: k.summeCents,
                  hinweis: `${k.anzahl} Vorgänge · ${formatProzent(k.summeCents / gesamtImFenster)} des Zeitraums`,
                }))}
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Im Bezugszeitraum nichts gebucht.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Die stärksten Positionen</CardTitle>
          <CardDescription>
            {a.besterTag
              ? `Bester Tag: ${a.besterTag.tag} mit ${formatEuro(a.besterTag.summeCents)} aus ${a.besterTag.anzahl} Vorgängen.`
              : 'Noch keine Buchungen im Bezugszeitraum.'}
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Position</th>
                <th className="px-6 py-3 text-right font-semibold">Anzahl</th>
                <th className="px-6 py-3 text-right font-semibold">Summe</th>
                <th className="px-6 py-3 text-right font-semibold">Anteil</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {a.top.map((t) => (
                <tr key={t.bezeichnung} className="hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{t.bezeichnung}</td>
                  <td className="tabular px-6 py-3 text-right font-mono">{t.anzahl}</td>
                  <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                    {formatEuro(t.summeCents)}
                  </td>
                  <td className="text-muted-foreground tabular px-6 py-3 text-right font-mono">
                    {formatProzent(t.summeCents / gesamtImFenster)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

async function StatusUebersicht({ userId }: { userId: string }) {
  await devDelay(1200)
  const { offen, genehmigt, ausgezahlt, storno } = await getStatusStaende(userId)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Offen"
        value={formatEuro(offen.summeCents)}
        hint={`${offen.anzahl} Positionen`}
      />
      <StatCard
        label="Genehmigt"
        value={formatEuro(genehmigt.summeCents)}
        hint={`${genehmigt.anzahl} Positionen`}
      />
      <StatCard
        label="Ausgezahlt"
        value={formatEuro(ausgezahlt.summeCents)}
        hint={`${ausgezahlt.anzahl} Positionen`}
      />
      <StatCard
        label="Storniert"
        value={formatEuro(storno.summeCents)}
        hint={`${storno.anzahl} Positionen · zählen nicht zum Verdienst`}
      />
    </div>
  )
}

async function TeamUebersicht() {
  await devDelay(1600)
  const zeilen = await getTeamProvisionen()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>Team-Übersicht</CardTitle>
        <CardDescription>Nur für Ausbilder und Teamleitung sichtbar.</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground border-border border-b text-xs">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Vertriebler</th>
              <th className="px-6 py-3 text-left font-semibold">Team</th>
              <th className="px-6 py-3 text-right font-semibold">Laufende Periode</th>
              <th className="px-6 py-3 text-right font-semibold">Gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {zeilen.map((z) => (
              <tr key={z.userId} className="hover:bg-muted/30">
                <td className="px-6 py-3.5 font-medium">{z.user?.displayName}</td>
                <td className="text-muted-foreground px-6 py-3.5">{z.user?.team?.name ?? '—'}</td>
                <td className="tabular px-6 py-3.5 text-right font-mono font-semibold">
                  {formatEuro(z.periodeCents)}
                </td>
                <td className="text-muted-foreground tabular px-6 py-3.5 text-right font-mono">
                  {formatEuro(z.summeCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
