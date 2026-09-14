'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatiereDauer, type Fortschritt } from '@/lib/lookup/fortschritt'
import { formatProzent, formatZahl } from '@/lib/utils'

/**
 * Der Stand der Schicht, ueber der Liste.
 *
 * Die Frage dahinter ist nicht „wie viele habe ich abgehakt", sondern „reicht
 * die Zeit bis Feierabend". Deshalb stehen hier drei Dinge nebeneinander:
 * geschafft, Tempo der letzten Stunde und – sobald genug vorliegt – wie lange
 * der Rest bei diesem Tempo noch dauert.
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
          <span className="tabular">{formatZahl(f.erledigt)}</span> von{' '}
          <span className="tabular">{formatZahl(f.gesamt)}</span> geschafft
        </p>
        <p className="text-muted-foreground tabular text-xs">{formatProzent(f.anteilErledigt)}</p>
      </div>

      <Progress value={f.anteilErledigt * 100} className="mt-2.5" />

      <p className="text-muted-foreground mt-2.5 text-xs">
        <span className="tabular">{formatZahl(f.zuPruefen)}</span> zu prüfen ·{' '}
        <span className="tabular">{formatZahl(f.unberuehrt)}</span> unberührt
        {f.letzteStunde > 0 ? (
          <>
            {' · '}
            <span className="text-foreground font-semibold">
              <span className="tabular">{formatZahl(f.letzteStunde)}</span> in der letzten Stunde
            </span>
          </>
        ) : null}
        {f.restMinuten != null ? (
          <> · bei dem Tempo noch ca. {formatiereDauer(f.restMinuten)}</>
        ) : null}
      </p>

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
