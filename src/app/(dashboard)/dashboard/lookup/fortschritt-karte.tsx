'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatiereDauer, type Fortschritt } from '@/lib/lookup/fortschritt'
import { formatProzent, formatZahl } from '@/lib/utils'

/**
 * Der Stand der Schicht, ueber der Liste.
 *
 * Die Frage dahinter ist nicht „wie viele habe ich abgehakt", sondern „reicht
 * die Zeit bis Feierabend". Deshalb stehen hier drei Dinge nebeneinander:
 * bearbeitet, Tempo der letzten Stunde und – sobald genug vorliegt – wie lange
 * der Rest bei diesem Tempo noch dauert.
 *
 * Der Balken hat zwei Segmente, weil es zwei Wahrheiten gibt: was durch ist
 * (hell) und was davon auch fuer die Auswertung zaehlt (voll). Ein „Nicht
 * erreicht" ist Arbeit und steht im hellen Teil – es geht aber trotzdem auf
 * der Restliste zurueck an PP.
 *
 * Die Hochrechnung ist ausdruecklich eine Schaetzung und steht auch so da.
 * `berechneFortschritt` liefert sie gar nicht erst, solange zu wenig Daten
 * vorliegen – lieber keine Zahl als eine, die aus drei Anrufen entsteht.
 */
export function FortschrittKarte({
  fortschritt: f,
  dubletten,
}: {
  fortschritt: Fortschritt
  dubletten: number
}) {
  return (
    <Card className="mb-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-semibold">
          <span className="tabular">{formatZahl(f.bearbeitet)}</span> von{' '}
          <span className="tabular">{formatZahl(f.gesamt)}</span> bearbeitet
        </p>
        <p className="text-muted-foreground tabular text-xs">{formatProzent(f.anteilBearbeitet)}</p>
      </div>

      <ZweiSegmente
        anteilBearbeitet={f.anteilBearbeitet}
        anteilErledigt={f.anteilErledigt}
        bearbeitet={f.bearbeitet}
        gesamt={f.gesamt}
      />

      <p className="text-muted-foreground mt-2.5 text-xs">
        <span className="text-foreground font-semibold">
          <span className="tabular">{formatZahl(f.erledigt)}</span> erledigt
        </span>
        {f.zuPruefen > 0 ? (
          <>
            {' · '}
            <span className="tabular">{formatZahl(f.zuPruefen)}</span> zu prüfen
          </>
        ) : null}
        {f.nurNotiert > 0 ? (
          <>
            {' · '}
            <span className="tabular">{formatZahl(f.nurNotiert)}</span> nur notiert
          </>
        ) : null}
        {' · '}
        <span className="tabular">{formatZahl(f.unberuehrt)}</span> unberührt
      </p>

      {f.letzteStunde > 0 || f.restMinuten != null ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {f.letzteStunde > 0 ? (
            <span className="text-foreground font-semibold">
              <span className="tabular">{formatZahl(f.letzteStunde)}</span> in der letzten Stunde
            </span>
          ) : null}
          {f.letzteStunde > 0 && f.restMinuten != null ? ' · ' : null}
          {f.restMinuten != null ? (
            <>bei dem Tempo noch ca. {formatiereDauer(f.restMinuten)}</>
          ) : null}
        </p>
      ) : null}

      {dubletten > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="accentSubtle">
            <span className="tabular">{formatZahl(dubletten)}</span> Dubletten
          </Badge>
          <span className="text-muted-foreground text-xs">
            Einträge mit gleicher Rufnummer oder gleichem Kunden – auf der Karte markiert.
          </span>
        </p>
      ) : null}
    </Card>
  )
}

/**
 * Zwei Segmente in einem Balken. Bewusst nicht ueber <Progress/>: das Primitiv
 * kennt einen Wert, hier sind es zwei, die uebereinanderliegen. Angesagt wird
 * der aeussere – „wie weit bin ich" ist die Frage, die der Balken beantwortet.
 */
function ZweiSegmente({
  anteilBearbeitet,
  anteilErledigt,
  bearbeitet,
  gesamt,
}: {
  anteilBearbeitet: number
  anteilErledigt: number
  bearbeitet: number
  gesamt: number
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(anteilBearbeitet * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${bearbeitet} von ${gesamt} bearbeitet`}
      className="bg-muted relative mt-2.5 h-2 w-full overflow-hidden rounded-full"
    >
      <div
        className="bg-primary/40 absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, anteilBearbeitet * 100)}%` }}
      />
      <div
        className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, anteilErledigt * 100)}%` }}
      />
    </div>
  )
}
