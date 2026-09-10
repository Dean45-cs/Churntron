import { Coffee, Swords, Target, Timer, Trophy } from 'lucide-react'
import type { DuellAnsicht, DuellSeiteAnsicht } from '@/lib/queries'
import { METRIK_INFO } from '@/lib/duels'
import { DUEL_METRIC_LABEL, DUEL_MODE_LABEL, DUEL_PHASE_LABEL } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn, initials } from '@/lib/utils'
import { DuellAktionen } from './duell-aktionen'

/**
 * Eine Duell-Karte.
 *
 * Server-Component: hier wird nur angezeigt, was die Abfrage schon fertig
 * gerechnet hat – kein Datum, kein Vergleich, keine Uhrzeit. Interaktiv sind
 * allein die Tasten in <DuellAktionen/>, und nur die tragen 'use client'.
 *
 * Kern der Karte ist das Tauziehen: ein Balken, der zeigt, welcher Anteil am
 * bisher Erreichten auf welche Seite entfaellt. Die eigene Seite steht immer
 * links und traegt Navy, die Gegenseite bleibt neutral grau. Orange fasst nur
 * den Sieg an – nie die Flaeche.
 */

const PHASE_VARIANTE = {
  EINLADUNG: 'accentSubtle',
  LAEUFT: 'success',
  BEENDET: 'default',
  ABGELEHNT: 'outline',
  ABGESAGT: 'outline',
  VERFALLEN: 'outline',
} as const

export function DuellKarte({ duell }: { duell: DuellAnsicht }) {
  // Die eigene Seite gehoert nach links – "ich gegen die" liest sich schneller
  // als "Seite 1 gegen Seite 2".
  const seiten = duell.meineSeite === 2 ? [...duell.seiten].reverse() : duell.seiten
  const gespielt = duell.phase !== 'ABGELEHNT' && duell.phase !== 'ABGESAGT'

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary" className="gap-1.5">
          <Swords className="size-3" />
          {DUEL_MODE_LABEL[duell.mode]}
        </Badge>
        <Badge variant={PHASE_VARIANTE[duell.phase]}>{DUEL_PHASE_LABEL[duell.phase]}</Badge>
        {duell.zielText ? (
          <Badge variant={duell.zielErreicht ? 'accentSubtle' : 'outline'} className="gap-1.5">
            <Target className="size-3" />
            Ziel {duell.zielText}
            {duell.zielErreicht
              ? ' erreicht'
              : duell.zielProzent !== null
                ? ` · ${duell.zielProzent} %`
                : ''}
          </Badge>
        ) : null}
        {duell.stake ? (
          <Badge variant="outline" className="gap-1.5">
            <Coffee className="size-3" />
            {duell.stake}
          </Badge>
        ) : null}
        {duell.restText ? (
          <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs font-medium">
            <Timer className="size-3.5" />
            {duell.restText}
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="leading-tight font-semibold">{METRIK_INFO[duell.metric].frage}</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          {DUEL_METRIC_LABEL[duell.metric]} · {duell.zeitraumText}
        </p>
      </div>

      {gespielt ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {seiten.map((seite, i) => (
              <SeitenSpalte key={seite.seite} seite={seite} rechts={i === 1} />
            ))}
          </div>

          {/* Tauziehen: der Balken teilt sich im Verhaeltnis der beiden Staende. */}
          <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
            {seiten.map((seite, i) => (
              <div
                key={seite.seite}
                style={{ width: `${seite.anteil}%` }}
                className={cn(
                  'h-full transition-[width] duration-500',
                  i === 0 ? 'bg-primary' : 'bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            duell.phase === 'BEENDET' && duell.seiten.some((s) => s.gewinnt && s.meine)
              ? 'text-accent'
              : 'text-muted-foreground',
          )}
        >
          {duell.phase === 'BEENDET' && !duell.unentschieden ? (
            <Trophy className="size-4 shrink-0" />
          ) : null}
          {duell.ergebnisText}
        </p>
        <DuellAktionen duell={duell} />
      </div>

      {duell.phase === 'EINLADUNG' ? (
        <p className="text-muted-foreground border-border border-t pt-3 text-xs">
          {duell.wartetAufText ? `Wartet noch auf ${duell.wartetAufText}. ` : ''}
          Der Stand läuft schon mit – so sieht man vor dem Annehmen, worauf man sich einlässt.
        </p>
      ) : null}
    </Card>
  )
}

function SeitenSpalte({ seite, rechts }: { seite: DuellSeiteAnsicht; rechts: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2', rechts && 'items-end text-right')}>
      <span
        className={cn(
          'tabular font-mono text-2xl font-semibold',
          seite.gewinnt ? 'text-accent' : 'text-foreground',
        )}
      >
        {seite.wertText}
      </span>

      <ul className={cn('flex flex-col gap-1.5', rechts && 'items-end')}>
        {seite.mitspieler.map((m) => (
          <li
            key={m.userId}
            className={cn('flex items-center gap-2', rechts && 'flex-row-reverse')}
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                m.binIch
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground',
              )}
              title={m.team ?? undefined}
            >
              {initials(m.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm leading-tight font-medium">
                {m.binIch ? 'Du' : m.name}
              </span>
              <span className="text-muted-foreground tabular block font-mono text-xs">
                {m.wertText}
                {m.angenommen ? '' : ' · offen'}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
