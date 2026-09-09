'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { ABOUT_MAX, JOBTITLE_MAX, NAME_MAX } from '@/lib/profil'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { profilSpeichern } from './actions'

/**
 * Die eigenen Angaben. Bewusst wenige: Anzeigename, Funktion und ein kurzer
 * Text. Alles andere – E-Mail, Rolle, Team – gehoert nicht dem Nutzer, sondern
 * der Verwaltung, und steht deshalb nebenan nur zum Nachlesen.
 */
export function ProfilForm({
  displayName,
  jobTitle,
  about,
}: {
  displayName: string
  jobTitle: string | null
  about: string | null
}) {
  const [werte, setWerte] = useState({
    displayName,
    jobTitle: jobTitle ?? '',
    about: about ?? '',
  })
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setzen = (feld: keyof typeof werte) => (e: { target: { value: string } }) => {
    setHinweis(null)
    setFehler(null)
    setWerte((alt) => ({ ...alt, [feld]: e.target.value }))
  }

  function speichern(formData: FormData) {
    startTransition(async () => {
      const r = await profilSpeichern(formData)
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
          <CardTitle>Meine Angaben</CardTitle>
          <CardDescription>
            Der Anzeigename steht in der Topbar, im Leaderboard und an jeder Aktivität.
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-4 p-6">
          <Field label="Anzeigename">
            <Input
              name="displayName"
              value={werte.displayName}
              onChange={setzen('displayName')}
              maxLength={NAME_MAX}
              required
              autoComplete="name"
            />
          </Field>

          <Field label="Funktion" hint="Optional, z. B. „Auszubildender KDM“ oder „Teamleitung“.">
            <Input
              name="jobTitle"
              value={werte.jobTitle}
              onChange={setzen('jobTitle')}
              maxLength={JOBTITLE_MAX}
              placeholder="ohne Angabe"
            />
          </Field>

          <Field
            label="Kurz zu mir"
            hint={`Optional. Noch ${Math.max(0, ABOUT_MAX - werte.about.length)} Zeichen.`}
          >
            <Textarea
              name="about"
              value={werte.about}
              onChange={setzen('about')}
              maxLength={ABOUT_MAX}
              rows={3}
              placeholder="ohne Angabe"
            />
          </Field>
        </div>

        <div className="border-border flex flex-wrap items-center gap-3 border-t px-6 py-4">
          <Button type="submit" disabled={pending}>
            <Save />
            {pending ? 'Speichert …' : 'Profil speichern'}
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
