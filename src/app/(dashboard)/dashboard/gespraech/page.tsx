import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Leitfaden } from '@/components/gespraech/leitfaden'
import { LEITFADEN } from '@/lib/leitfaden'

/**
 * Das Zuhause des Leitfadens: breit genug, um ihn mit dem Ausbilder
 * durchzugehen. Fuer das Gespraech selbst gibt es von hier aus den Knopf
 * "Eigenes Fenster" – und auf jeder anderen Seite den Griff am rechten Rand.
 *
 * Kein <Suspense>: der Leitfaden holt keine Daten, er liest aus einer Datei.
 * Der Ladezustand steht in loading.tsx und faengt den Sprung ab, bis das
 * JavaScript der Client-Komponente da ist.
 */
export default function GespraechPage() {
  return (
    <>
      <PageHeader
        title="Gespräch"
        description={`${LEITFADEN.titel} · ${LEITFADEN.einsatz}. Pfeiltasten blättern durch die Phasen, „e“ springt zu den Einwänden und zurück.`}
      />

      <Card className="h-[calc(100dvh-14rem)] min-h-[34rem] overflow-hidden">
        <Leitfaden />
      </Card>
    </>
  )
}
