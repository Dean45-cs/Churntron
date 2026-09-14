'use client'

import { useRef, useState, useTransition } from 'react'
import { KeyRound } from 'lucide-react'
import { PASSWORT_MIN } from '@/lib/profil'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { passwortAendern } from '../actions'

/**
 * Passwort aendern.
 *
 * Unkontrollierte Felder mit einem Formular-Ref: Passwoerter gehoeren nicht in
 * React-State, wo sie an Devtools und Fehlerberichten vorbeikommen. Nach dem
 * Speichern raeumt das Formular sich selbst wieder auf.
 */
export function PasswortForm() {
  const formular = useRef<HTMLFormElement>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function speichern(formData: FormData) {
    startTransition(async () => {
      const r = await passwortAendern(formData)
      if (r.ok) {
        setFehler(null)
        setHinweis(r.hinweis ?? 'Gespeichert.')
        formular.current?.reset()
      } else {
        setHinweis(null)
        setFehler(r.fehler)
      }
    })
  }

  return (
    <form ref={formular} action={speichern}>
      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>
            Mindestens {PASSWORT_MIN} Zeichen. Eine Wortfolge, die du dir merken kannst, ist besser
            als ein kurzes Kunstwort mit Sonderzeichen.
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-4 p-6">
          <Field label="Bisheriges Passwort">
            <Input
              name="alt"
              type="password"
              required
              autoComplete="current-password"
              onChange={() => {
                setHinweis(null)
                setFehler(null)
              }}
            />
          </Field>

          <Field label="Neues Passwort">
            <Input
              name="neu"
              type="password"
              required
              minLength={PASSWORT_MIN}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Neues Passwort wiederholen">
            <Input
              name="wiederholung"
              type="password"
              required
              minLength={PASSWORT_MIN}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="border-border flex flex-wrap items-center gap-3 border-t px-6 py-4">
          <Button type="submit" disabled={pending}>
            <KeyRound />
            {pending ? 'Ändert …' : 'Passwort ändern'}
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
