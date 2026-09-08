'use client'

import { useRef, useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { JOBTITLE_MAX, NAME_MAX, PASSWORT_MIN } from '@/lib/profil'
import { ROLE_LABEL } from '@/lib/labels'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { nutzerAnlegen } from './actions'

/** Neues Konto. Das Startpasswort setzt der Admin und gibt es persoenlich weiter. */
export function NeuerNutzerForm({ teams }: { teams: { id: string; name: string }[] }) {
  const formular = useRef<HTMLFormElement>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function anlegen(formData: FormData) {
    startTransition(async () => {
      const r = await nutzerAnlegen(formData)
      if (r.ok) {
        setFehler(null)
        setHinweis(r.hinweis ?? 'Angelegt.')
        formular.current?.reset()
      } else {
        setHinweis(null)
        setFehler(r.fehler)
      }
    })
  }

  return (
    <form ref={formular} action={anlegen}>
      <Card>
        <CardHeader className="border-border border-b pb-4">
          <CardTitle>Konto anlegen</CardTitle>
          <CardDescription>
            Ohne Selbstregistrierung: wer Zugang bekommt, entscheidet die Teamleitung.
          </CardDescription>
        </CardHeader>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Anzeigename">
            <Input name="displayName" required maxLength={NAME_MAX} autoComplete="off" />
          </Field>

          <Field label="E-Mail" hint="Zugleich der Anmeldename.">
            <Input name="email" type="email" required autoComplete="off" className="font-mono" />
          </Field>

          <Field label="Funktion" hint="Optional.">
            <Input name="jobTitle" maxLength={JOBTITLE_MAX} autoComplete="off" />
          </Field>

          <Field label="Team">
            <Select name="teamId" defaultValue="">
              <option value="">ohne Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Rolle">
            <Select name="role" defaultValue="REP">
              {(['REP', 'ADMIN'] as const).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Startpasswort"
            hint={`Mindestens ${PASSWORT_MIN} Zeichen. Persönlich weitergeben, nicht per Chat.`}
          >
            <Input
              name="passwort"
              type="text"
              required
              minLength={PASSWORT_MIN}
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="border-border flex flex-wrap items-center gap-3 border-t px-6 py-4">
          <Button type="submit" disabled={pending}>
            <UserPlus />
            {pending ? 'Legt an …' : 'Konto anlegen'}
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
