import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Eine Formularkarte: Kopf mit Titel und Beschreibung, untereinander stehende
 * Felder, unten die Leiste mit der Schaltflaeche.
 *
 * Die Masse folgen den echten Bausteinen – 11 Einheiten hoch fuer ein Feld
 * (siehe ui/field.tsx), 10 fuer die Schaltflaeche (ui/button.tsx). Wer dort
 * etwas an der Hoehe aendert, muss es hier mitziehen.
 */
export function FormularSkeleton({
  felder = 3,
  breiteSchaltflaeche = 'w-40',
}: {
  felder?: number
  breiteSchaltflaeche?: string
}) {
  return (
    <Card>
      <div className="border-border flex flex-col gap-2 border-b px-6 pt-6 pb-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-72" />
      </div>

      <div className="flex flex-col gap-4 p-6">
        {Array.from({ length: felder }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="border-border border-t px-6 py-4">
        <Skeleton className={`h-10 rounded-xl ${breiteSchaltflaeche}`} />
      </div>
    </Card>
  )
}

/** Nur der Kartenkopf – fuer die reinen Hinweiskarten ohne Formular. */
export function HinweisKarteSkeleton({ zeilen = 2 }: { zeilen?: number }) {
  return (
    <Card>
      <div className="flex flex-col gap-2 px-6 pt-6 pb-6">
        <Skeleton className="h-4 w-48" />
        {Array.from({ length: zeilen }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full max-w-lg" />
        ))}
      </div>
    </Card>
  )
}
