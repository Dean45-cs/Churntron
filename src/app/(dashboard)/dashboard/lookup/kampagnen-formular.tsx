'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FormularStand, KampagnenTyp, LookupRecord } from '@/lib/lookup/types'
import { kampagnenLabel } from '@/lib/lookup/export'
import { cn } from '@/lib/utils'

/**
 * Das Kampagnen-Formular. Es geht auf, sobald bei Welcome oder Courtesy der
 * Erledigt-Haken gesetzt wird – genau der Moment, in dem die Angaben noch
 * praesent sind. Genau diese Felder landen spaeter in der Reporting-CSV.
 *
 * Das Beratungsprotokoll und die Bewertung gibt es nur beim Welcome Call;
 * beim Courtesy Call wird nur nach der Home-ID gefragt. Diese Aufteilung
 * steckt auch in `buildReportingZeilen` – wer hier etwas aendert, aendert
 * die Auswertung.
 */
export function KampagnenFormular({
  record,
  camp,
  stand,
  onSet,
  onClose,
  onUndone,
}: {
  record: LookupRecord
  camp: KampagnenTyp
  stand: FormularStand
  onSet: (feld: keyof FormularStand, wert: boolean | number) => void
  onClose: () => void
  onUndone: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="formular-titel"
        tabIndex={-1}
        className="bg-card relative z-10 w-full max-w-md rounded-t-2xl shadow-[var(--shadow-soft)] outline-none sm:rounded-2xl"
      >
        <div className="border-border flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id="formular-titel" className="truncate text-base font-semibold">
              {record.name || '—'}
            </h2>
            <p className="text-muted-foreground tabular truncate font-mono text-sm">
              {record.dials[0] || record.dial}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-muted-foreground hover:text-foreground -mt-1 shrink-0 p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Formular · {kampagnenLabel(camp)}
          </p>

          <label className="border-border flex items-center justify-between gap-3 border-b py-3">
            <span className="text-sm font-medium">Home-ID aufgenommen</span>
            <input
              type="checkbox"
              checked={!!stand.homeId}
              onChange={(e) => onSet('homeId', e.target.checked)}
              className="accent-primary size-5"
            />
          </label>

          {camp === 'welcome' ? (
            <>
              <label className="border-border flex items-center justify-between gap-3 border-b py-3">
                <span className="text-sm font-medium">Beratungsprotokoll (D2D) ausgehändigt</span>
                <input
                  type="checkbox"
                  checked={!!stand.protokoll}
                  onChange={(e) => onSet('protokoll', e.target.checked)}
                  className="accent-primary size-5"
                />
              </label>

              <div className="py-3">
                <p className="mb-2 text-sm font-medium">Bewertung der Beratung (1–6)</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={stand.bewertung === n}
                      onClick={() => onSet('bewertung', n)}
                      className={cn(
                        'focus-visible:ring-ring tabular h-10 flex-1 rounded-xl border text-sm font-semibold outline-none focus-visible:ring-2',
                        stand.bewertung === n
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-border flex justify-between gap-3 border-t px-5 py-3">
          <Button variant="ghost" onClick={onUndone}>
            Erledigt aufheben
          </Button>
          <Button onClick={onClose}>Fertig</Button>
        </div>
      </div>
    </div>
  )
}
