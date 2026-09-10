'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { AKTUALISIERUNG_LABEL, AKTUALISIERUNG_STUFEN } from '@/lib/profil'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Select } from '@/components/ui/field'
import { anzeigeSpeichern } from '../actions'

/**
 * Anzeige-Einstellungen. Bislang genau eine, und die ist die wichtigere Haelfte
 * der Antwort auf „warum sehe ich nicht, was die anderen gerade buchen": die
 * Daten sind laengst gemeinsam, nur das Nachladen fehlte.
 */
export function AnzeigeForm({ autoRefreshSeconds }: { autoRefreshSeconds: number }) {
  const [wert, setWert] = useState(String(autoRefreshSeconds))
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function speichern(formData: FormData) {
    startTransition(async () => {
      const r = await anzeigeSpeichern(formData)
      if (r.ok) {
        setFehler(null)
        setHinweis(r.hinweis ?? 'Gespeichert.')
      } else {
        setHinweis(null)
        setFehler(r.fehler)
      }
    })
  }

  return (
    <form action={speichern}>
      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Von allein aktualisieren</CardTitle>
          <CardDescription>
            Alle arbeiten auf derselben Datenbank – neue Buchungen und Punkte sind sofort da. Ohne
            diese Einstellung siehst du sie erst beim nächsten Seitenwechsel.
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-4 p-6">
          <Field
            label="Takt"
            hint="Läuft nur, solange das Fenster im Vordergrund ist. Was du gerade tippst, bleibt stehen."
          >
            <Select
              name="aktualisierung"
              value={wert}
              onChange={(e) => {
                setHinweis(null)
                setFehler(null)
                setWert(e.target.value)
              }}
            >
              {AKTUALISIERUNG_STUFEN.map((s) => (
                <option key={s} value={s}>
                  {AKTUALISIERUNG_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="border-border flex flex-wrap items-center gap-3 border-t px-6 py-4">
          <Button type="submit" disabled={pending}>
            <Save />
            {pending ? 'Speichert …' : 'Speichern'}
          </Button>
          {hinweis ? <span className="text-success text-sm font-medium">{hinweis}</span> : null}
          {fehler ? (
            <span role="alert" className="text-destructive text-sm font-medium">
              {fehler}
            </span>
          ) : null}
        </div>
      </Card>
    </form>
  )
}
