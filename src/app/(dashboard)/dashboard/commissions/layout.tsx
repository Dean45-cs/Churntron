import { CommissionsNav } from './commissions-nav'

/**
 * Das Provisionsmodul hat fuenf Ansichten auf denselben Daten. Kopf und Reiter
 * stehen deshalb im Layout: beim Wechsel bleiben sie stehen, und das loading.tsx
 * des jeweiligen Segments faerbt nur den Inhalt darunter ein.
 */
export default function CommissionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Provisionen</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Selbst tracken, auswerten und gegen die Abrechnung halten – nach dem Provisionskatalog der
          TNG Stadtnetz GmbH.
        </p>
      </div>
      <CommissionsNav />
      {children}
    </>
  )
}
