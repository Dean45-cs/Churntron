import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { LookupClient } from './lookup-client'

/**
 * Kampagnen-Lookup – der Dialer fuer die Schicht.
 *
 * Bewusst eine Seite ohne Datenabruf: Es gibt hier nichts, was der Server
 * laden koennte. Die Liste kommt aus der Datei, die der Vertriebler selbst
 * ins Feld zieht, und bleibt in seinem Browser. Deshalb steht hier auch
 * keine Server-Component mit <Suspense> – es gibt keine Abfrage, auf die
 * gewartet wuerde.
 */
export const metadata = {
  title: 'Kampagnen-Lookup',
}

export default function LookupPage() {
  return (
    <>
      <PageHeader
        title="Kampagnen-Lookup"
        description="Excel-Liste laden, Kunden nachschlagen, Nummer kopieren und abhaken. Am Schichtende die Restliste und das Reporting herunterladen."
      />

      <div className="border-border bg-secondary/50 mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3">
        <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          <span className="text-foreground font-semibold">
            Die Liste bleibt auf diesem Rechner.
          </span>{' '}
          Sie wird im Browser gelesen und dort durchsucht – sie wird nicht hochgeladen und landet
          nicht in der Churntron-Datenbank. Markierungen, Formulare und Notizen liegen im
          Browser-Speicher dieses Geräts.
        </p>
      </div>

      <LookupClient />
    </>
  )
}
