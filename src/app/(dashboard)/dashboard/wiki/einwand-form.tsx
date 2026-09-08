'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import type { WikiEintrag } from '@/lib/queries'
import { OBJECTION_CATEGORIES, OBJECTION_CATEGORY_LABEL } from '@/lib/labels'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { einwandAendern, einwandAnlegen } from './actions'

/**
 * Das Formular fuer neue und ueberarbeitete Eintraege – dasselbe fuer beides,
 * weil sich beides nur darin unterscheidet, ob die Felder vorbelegt sind.
 *
 * Es steht bewusst auf derselben Seite wie die Suche und nicht hinter einem
 * eigenen Pfad: eine Einwandbehandlung entsteht direkt nach dem Gespraech, in
 * dem sie funktioniert hat. Wer dafuer erst navigieren muss, schreibt sie nicht
 * auf.
 */
export function EinwandForm({
  eintrag,
  titelVorschlag,
  onFertig,
  onAbbrechen,
}: {
  eintrag?: WikiEintrag
  /** Bei „kein Treffer" steht der Suchbegriff schon in der Überschrift. */
  titelVorschlag?: string
  onFertig: (hinweis?: string) => void
  onAbbrechen: () => void
}) {
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, startTransition] = useTransition()

  function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formular = event.currentTarget
    const formData = new FormData(formular)
    setFehler(null)

    startTransition(async () => {
      const ergebnis = eintrag
        ? await einwandAendern(eintrag.id, formData)
        : await einwandAnlegen(formData)

      if (!ergebnis.ok) {
        setFehler(ergebnis.fehler)
        return
      }
      if (!eintrag) formular.reset()
      onFertig(ergebnis.hinweis)
    })
  }

  return (
    <Card>
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>
          {eintrag ? 'Einwandbehandlung überarbeiten' : 'Neue Einwandbehandlung'}
        </CardTitle>
        <CardDescription>
          Was der Kunde sagt, und was darauf funktioniert. Keine Kundendaten – kein Name, keine
          Vertrags- oder Telefonnummer.
        </CardDescription>
      </CardHeader>

      <form onSubmit={absenden} className="flex flex-col gap-4 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Der Einwand" hint="Möglichst so, wie er am Telefon fällt.">
            <Input
              name="title"
              required
              maxLength={140}
              defaultValue={eintrag?.title ?? titelVorschlag ?? ''}
              placeholder="Das ist mir zu teuer"
            />
          </Field>
          <Field label="Thema" className="sm:w-56">
            <Select name="category" defaultValue={eintrag?.category ?? 'PRICE'}>
              {OBJECTION_CATEGORIES.map((k) => (
                <option key={k} value={k}>
                  {OBJECTION_CATEGORY_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Klingt auch so"
          hint="Eine Formulierung pro Zeile. Sie sind das Herz der Suche – gesucht wird nach dem, was gerade gesagt wurde."
        >
          <Textarea
            name="variants"
            rows={3}
            defaultValue={eintrag?.variants.join('\n') ?? ''}
            placeholder={'kostet zu viel\ndas kann ich mir nicht leisten'}
          />
        </Field>

        <Field label="Die Einwandbehandlung" hint="Zeilenumbrüche bleiben erhalten.">
          <Textarea
            name="answer"
            required
            rows={7}
            maxLength={4000}
            defaultValue={eintrag?.answer ?? ''}
            placeholder="Anerkennen, einordnen, Nutzen zeigen – und mit einer Frage weitergeben."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rückfrage danach" hint="Der Satz, der das Gespräch weiterträgt.">
            <Input
              name="followUp"
              maxLength={240}
              defaultValue={eintrag?.followUp ?? ''}
              placeholder="Wenn der Preis passen würde – wäre der Rest in Ordnung?"
            />
          </Field>
          <Field label="Schlagworte" hint="Mit Komma getrennt.">
            <Input
              name="tags"
              defaultValue={eintrag?.tags.join(', ') ?? ''}
              placeholder="Preis, Vergleich, Nutzen"
            />
          </Field>
        </div>

        {fehler ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {fehler}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={laeuft}>
            {laeuft ? <Loader2 className="animate-spin" /> : null}
            {eintrag ? 'Änderungen speichern' : 'Anlegen'}
          </Button>
          <Button type="button" variant="ghost" onClick={onAbbrechen} disabled={laeuft}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  )
}
