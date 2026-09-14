'use client'

import { NOTIZ_BAUSTEINE, bausteinAktiv, toggleBaustein } from '@/lib/lookup/storage'
import { Textarea } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Die interne Notiz zu einem Datensatz.
 *
 * Sie ist der Grund, warum das Lookup ueberhaupt nach Churntron gewandert ist:
 * Das alte Tool kennt nur Haken und die Bewertung von 1 bis 6 – beides geht an
 * PP. Was man sich waehrend des Gespraechs selbst notiert, hatte bisher keinen
 * Platz und landete auf Zetteln.
 *
 * Zwei Ebenen, damit es waehrend des Telefonats schnell geht:
 * die haeufigen Faelle als Baustein zum Antippen, alles andere als Freitext.
 *
 * Die Notiz bleibt intern. Sie steht in keinem der beiden Exporte – siehe
 * `src/lib/lookup/export.ts`.
 */
export function NotizFeld({
  notiz,
  onChange,
}: {
  notiz: string
  onChange: (wert: string) => void
}) {
  return (
    <div className="border-border bg-muted/30 border-t px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-muted-foreground text-[10.5px] font-semibold tracking-wide uppercase">
          Notiz
        </span>
        <span className="text-muted-foreground/70 text-[10.5px]">
          nur für dich – nicht im Reporting
        </span>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {NOTIZ_BAUSTEINE.map((baustein) => {
          const aktiv = bausteinAktiv(notiz, baustein)
          return (
            <button
              key={baustein}
              type="button"
              aria-pressed={aktiv}
              onClick={() => onChange(toggleBaustein(notiz, baustein))}
              className={cn(
                'focus-visible:ring-ring rounded-full px-2.5 py-1 text-xs font-semibold transition-colors outline-none focus-visible:ring-2',
                aktiv
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground border',
              )}
            >
              {baustein}
            </button>
          )
        })}
      </div>

      <Textarea
        rows={2}
        value={notiz}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Eigene Notiz …"
        aria-label="Interne Notiz"
        className="text-sm"
      />
    </div>
  )
}
