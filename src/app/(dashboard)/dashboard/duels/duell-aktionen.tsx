'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import type { DuellAnsicht } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { duellAbsagen, einladungAblehnen, einladungAnnehmen } from './actions'

/**
 * Die Tasten an einer Duell-Karte. Der einzige Teil des Moduls, der wirklich
 * interaktiv ist – deshalb steht 'use client' hier und nicht an der Karte.
 *
 * Kein optimistisches Umschalten wie im Provisions-Tracker: eine Zusage wird
 * einmal gegeben und nicht vierzig Mal pro Schicht. Die Runde zum Server darf
 * man hier abwarten.
 */
export function DuellAktionen({ duell }: { duell: DuellAnsicht }) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function fuehreAus(aktion: () => Promise<{ ok: boolean; fehler?: string }>) {
    setFehler(null)
    startTransition(async () => {
      const ergebnis = await aktion()
      if (!ergebnis.ok) setFehler(ergebnis.fehler ?? 'Das hat nicht geklappt.')
    })
  }

  const kannAbsagen =
    duell.binHerausforderer && (duell.phase === 'EINLADUNG' || duell.phase === 'LAEUFT')

  if (!duell.mussIchAntworten && !kannAbsagen) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fehler ? (
        <p role="alert" className="text-destructive text-xs font-medium">
          {fehler}
        </p>
      ) : null}

      {duell.mussIchAntworten ? (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => fuehreAus(() => einladungAnnehmen(duell.id))}
          >
            <Check />
            Annehmen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => fuehreAus(() => einladungAblehnen(duell.id))}
          >
            <X />
            Ablehnen
          </Button>
        </>
      ) : null}

      {kannAbsagen && !duell.mussIchAntworten ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => fuehreAus(() => duellAbsagen(duell.id))}
        >
          <X />
          Absagen
        </Button>
      ) : null}
    </div>
  )
}
