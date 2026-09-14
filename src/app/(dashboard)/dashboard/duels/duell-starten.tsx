'use client'

import { useState, useTransition } from 'react'
import type { DuelMetric } from '@prisma/client'
import { Swords, X } from 'lucide-react'
import type { Kollege } from '@/lib/queries'
import { METRIK_INFO, ZEITRAUM_LABEL, type ZeitraumVorlage } from '@/lib/duels'
import { DUEL_METRIC_LABEL } from '@/lib/labels'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { duellStarten } from './actions'

/**
 * Das Formular, mit dem eine Herausforderung rausgeht.
 *
 * Zugeklappt ist es eine einzelne Taste – die Seite soll die laufenden Duelle
 * zeigen und nicht ein Formular, das man dreimal pro Woche braucht.
 *
 * Der Zielwert wird in der Einheit der Disziplin getippt: bei Provision in
 * Euro, sonst als Stueckzahl. Umgerechnet wird in der Server Action, damit im
 * Browser nichts entschieden wird, was in die Datenbank geht.
 */

const METRIKEN: DuelMetric[] = [
  'COMMISSION_CENTS',
  'SALES',
  'BOOKINGS',
  'CHURN_SAVED',
  'CALLS',
  'POINTS',
]

const ZEITRAEUME: (ZeitraumVorlage | 'EIGEN')[] = ['HEUTE', 'WOCHE', 'PERIODE', 'EIGEN']

export function DuellStarten({ kollegen }: { kollegen: Kollege[] }) {
  const [offen, setOffen] = useState(false)
  const [zweiGegenZwei, setZweiGegenZwei] = useState(false)
  const [metrik, setMetrik] = useState<DuelMetric>('COMMISSION_CENTS')
  const [zeitraum, setZeitraum] = useState<ZeitraumVorlage | 'EIGEN'>('HEUTE')
  const [partner, setPartner] = useState('')
  const [gegner, setGegner] = useState<[string, string]>(['', ''])
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Niemand tritt zweimal an – wer schon gewaehlt ist, verschwindet aus den
  // anderen Listen. Das erspart die Fehlermeldung nach dem Absenden.
  const belegt = (ausser: string) =>
    [partner, ...gegner].filter((id) => id && id !== ausser) as string[]
  const auswahl = (eigener: string) => kollegen.filter((k) => !belegt(eigener).includes(k.id))

  function absenden(formData: FormData) {
    setMeldung(null)
    startTransition(async () => {
      const ergebnis = await duellStarten(formData)
      if (ergebnis.ok) {
        // Nach einer verschickten Herausforderung faengt das Formular von vorn
        // an – sonst steht beim naechsten Oeffnen noch der alte Zeitraum drin.
        setMeldung({ ok: true, text: ergebnis.hinweis ?? 'Herausforderung ist raus.' })
        setOffen(false)
        setPartner('')
        setGegner(['', ''])
        setZeitraum('HEUTE')
      } else {
        setMeldung({ ok: false, text: ergebnis.fehler })
      }
    })
  }

  if (kollegen.length === 0) {
    return (
      <Card className="text-muted-foreground p-6 text-sm">
        Für ein Duell braucht es mindestens eine Kollegin oder einen Kollegen im System.
      </Card>
    )
  }

  if (!offen) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="accent" onClick={() => setOffen(true)}>
          <Swords />
          Duell ausrufen
        </Button>
        {meldung ? (
          <p
            role="status"
            className={cn('text-sm font-medium', meldung.ok ? 'text-success' : 'text-destructive')}
          >
            {meldung.text}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-border flex-row items-start justify-between border-b pb-4">
        <div>
          <CardTitle>Duell ausrufen</CardTitle>
          <CardDescription>
            Du bist automatisch dabei. Die anderen bekommen eine Einladung und müssen zusagen.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="Schließen" onClick={() => setOffen(false)}>
          <X />
        </Button>
      </CardHeader>

      <form action={absenden} className="flex flex-col gap-6 p-6">
        <input type="hidden" name="modus" value={zweiGegenZwei ? 'TWO_VS_TWO' : 'ONE_VS_ONE'} />
        <input type="hidden" name="zeitraum" value={zeitraum} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Modus</legend>
          <div className="flex gap-2">
            {[false, true].map((zwei) => (
              <button
                key={String(zwei)}
                type="button"
                aria-pressed={zweiGegenZwei === zwei}
                onClick={() => setZweiGegenZwei(zwei)}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  zweiGegenZwei === zwei
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary border',
                )}
              >
                {zwei ? '2 gegen 2' : '1 gegen 1'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Die beiden Seiten stehen nebeneinander wie spaeter auf der Karte –
            links die eigene, rechts die Gegenseite. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Deine Seite
            </p>
            <p className="border-border bg-secondary/50 text-secondary-foreground flex h-11 items-center rounded-xl border px-3.5 text-sm font-medium">
              Du
            </p>
            {zweiGegenZwei ? (
              <Field label="Partner">
                <Select
                  name="partner"
                  required
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                >
                  <option value="">Bitte wählen …</option>
                  {auswahl(partner).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.displayName}
                      {k.team ? ` · ${k.team}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Gegenseite
            </p>
            <Field label={zweiGegenZwei ? 'Gegner 1' : 'Gegen wen?'}>
              <Select
                name="gegner"
                required
                value={gegner[0]}
                onChange={(e) => setGegner([e.target.value, gegner[1]])}
              >
                <option value="">Bitte wählen …</option>
                {auswahl(gegner[0]).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.displayName}
                    {k.team ? ` · ${k.team}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            {zweiGegenZwei ? (
              <Field label="Gegner 2">
                <Select
                  name="gegner"
                  required
                  value={gegner[1]}
                  onChange={(e) => setGegner([gegner[0], e.target.value])}
                >
                  <option value="">Bitte wählen …</option>
                  {auswahl(gegner[1]).map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.displayName}
                      {k.team ? ` · ${k.team}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        </div>

        <Field label="Worum wird gespielt?" hint={METRIK_INFO[metrik].quelle}>
          <Select
            name="metrik"
            value={metrik}
            onChange={(e) => setMetrik(e.target.value as DuelMetric)}
          >
            {METRIKEN.map((m) => (
              <option key={m} value={m}>
                {METRIK_INFO[m].frage} ({DUEL_METRIC_LABEL[m]})
              </option>
            ))}
          </Select>
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Zeitraum</legend>
          <div className="flex flex-wrap gap-2">
            {ZEITRAEUME.map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={zeitraum === z}
                onClick={() => setZeitraum(z)}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  zeitraum === z
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary border',
                )}
              >
                {z === 'EIGEN' ? 'Eigener Zeitraum' : ZEITRAUM_LABEL[z]}
              </button>
            ))}
          </div>

          {zeitraum === 'EIGEN' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Von">
                <Input name="von" type="date" required className="tabular font-mono" />
              </Field>
              <Field label="Bis" hint="Einschließlich – der letzte Tag zählt ganz mit.">
                <Input name="bis" type="date" required className="tabular font-mono" />
              </Field>
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={`Zielwert (optional, ${METRIK_INFO[metrik].einheit === 'euro' ? '€' : 'Stück'})`}
            hint="Ohne Ziel gewinnt, wer am Ende vorn liegt."
          >
            <Input
              name="ziel"
              inputMode="decimal"
              placeholder={METRIK_INFO[metrik].einheit === 'euro' ? 'z. B. 250,00' : 'z. B. 10'}
              className="tabular font-mono"
            />
          </Field>

          <Field label="Einsatz (optional)" hint="Kaffee, Kuchen, Ehre.">
            <Input name="einsatz" maxLength={80} placeholder="z. B. Kaffee für eine Woche" />
          </Field>
        </div>

        {meldung && !meldung.ok ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {meldung.text}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="accent" disabled={pending}>
            <Swords />
            {pending ? 'Wird ausgerufen …' : 'Herausfordern'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOffen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  )
}
