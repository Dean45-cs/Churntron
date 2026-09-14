'use client'

import { useMemo, useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import {
  STEUERKLASSEN,
  berechneAufschlag,
  type Steuerjahr,
  type Steuerklasse,
} from '@/lib/brutto-netto'
import type { Arbeitsprofil } from '@/lib/earnings'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { centsAlsEingabe, eingabeAlsCents, formatEuro, formatProzent } from '@/lib/utils'
import { einstellungenSpeichern } from '../actions'

/**
 * Der Rechner laeuft im Browser: die Steuerlogik ist reine Rechnung ohne
 * Datenbank, also kann sie bei jedem Tastendruck neu laufen. Gespeichert wird
 * nur, was dauerhaft gilt – die eigenen Angaben. Der Provisionsbetrag daneben
 * ist ein Was-waere-wenn und geht niemanden etwas an.
 */
/**
 * Ein Vorschlag zum Uebernehmen: der eigene Stand im Kalendermonat und im
 * Abrechnungszeitraum. Beide stehen zur Wahl, weil beide eine berechtigte
 * Frage beantworten – „was habe ich diesen Monat gemacht" und „was kommt
 * auf der naechsten Abrechnung an".
 */
export type Vorschlag = { art: string; label: string; spanne: string; cents: number }

export function RechnerForm({
  profil,
  vorschlaege,
}: {
  profil: Arbeitsprofil
  vorschlaege: Vorschlag[]
}) {
  const [werte, setWerte] = useState({
    grundgehalt: centsAlsEingabe(profil.grundgehaltCents),
    steuerklasse: String(profil.steuerklasse),
    kirchensteuer: String(profil.kirchensteuerProzent),
    kinderfreibetraege: String(profil.kinderfreibetraege),
    kinder: String(profil.kinder),
    kvzusatz: (profil.kvZusatzBp / 100).toFixed(2).replace('.', ','),
    steuerjahr: String(profil.steuerjahr),
    wochenstunden: String(profil.wochenstunden).replace('.', ','),
    arbeitstage: String(profil.arbeitstageProWoche),
  })
  // Vorbelegt ist der Abrechnungszeitraum – das ist der Betrag, der tatsaechlich
  // ueberwiesen wird und um den es beim Netto geht.
  const [provision, setProvision] = useState(centsAlsEingabe(vorschlaege[0]?.cents ?? 0))
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setzen = (feld: keyof typeof werte) => (e: { target: { value: string } }) => {
    setHinweis(null)
    setWerte((alt) => ({ ...alt, [feld]: e.target.value }))
  }

  const ergebnis = useMemo(() => {
    const zahl = (roh: string, standard: number) => {
      const wert = Number(roh.replace(',', '.'))
      return Number.isFinite(wert) ? wert : standard
    }
    return berechneAufschlag({
      grundgehaltCents: Math.max(0, eingabeAlsCents(werte.grundgehalt) ?? 0),
      provisionCents: Math.max(0, eingabeAlsCents(provision) ?? 0),
      steuerklasse: (Math.min(6, Math.max(1, zahl(werte.steuerklasse, 1))) as Steuerklasse) ?? 1,
      kirchensteuerProzent: zahl(werte.kirchensteuer, 0),
      kinderfreibetraege: zahl(werte.kinderfreibetraege, 0),
      kinder: Math.round(zahl(werte.kinder, 0)),
      kvZusatzBp: Math.round(zahl(werte.kvzusatz, 2.9) * 100),
      jahr: (zahl(werte.steuerjahr, 2026) === 2025 ? 2025 : 2026) as Steuerjahr,
    })
  }, [werte, provision])

  function speichern(formData: FormData) {
    startTransition(async () => {
      const r = await einstellungenSpeichern(formData)
      setHinweis(r.ok ? (r.hinweis ?? 'Gespeichert.') : r.fehler)
    })
  }

  const zeilen = [
    { label: 'Lohnsteuer', wert: ergebnis.mit.lohnsteuerCents },
    { label: 'Solidaritätszuschlag', wert: ergebnis.mit.soliCents },
    { label: 'Kirchensteuer', wert: ergebnis.mit.kirchensteuerCents },
    { label: 'Krankenversicherung', wert: ergebnis.mit.kvCents },
    { label: 'Pflegeversicherung', wert: ergebnis.mit.pvCents },
    { label: 'Rentenversicherung', wert: ergebnis.mit.rvCents },
    { label: 'Arbeitslosenversicherung', wert: ergebnis.mit.avCents },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form action={speichern}>
        <Card>
          <CardHeader className="border-border border-b pb-4">
            <CardTitle>Meine Angaben</CardTitle>
            <CardDescription>
              Bleiben gespeichert. Die Wochenstunden tragen auch den Stundenschnitt im Reiter
              „Verdienst“.
            </CardDescription>
          </CardHeader>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Grundgehalt im Monat (brutto)" hint="Ohne Provision. 0 = nur Provision.">
              <Input
                name="grundgehalt"
                inputMode="decimal"
                value={werte.grundgehalt}
                onChange={setzen('grundgehalt')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Steuerklasse">
              <Select
                name="steuerklasse"
                value={werte.steuerklasse}
                onChange={setzen('steuerklasse')}
              >
                {STEUERKLASSEN.map((k) => (
                  <option key={k} value={k}>
                    {['I', 'II', 'III', 'IV', 'V', 'VI'][k - 1]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Kirchensteuer">
              <Select
                name="kirchensteuer"
                value={werte.kirchensteuer}
                onChange={setzen('kirchensteuer')}
              >
                <option value="0">keine</option>
                <option value="9">9 % (u. a. Schleswig-Holstein)</option>
                <option value="8">8 % (Bayern, Baden-Württemberg)</option>
              </Select>
            </Field>

            <Field label="Kinderfreibeträge" hint="Wie in den ELStAM, z. B. 0,5 oder 1.">
              <Input
                name="kinderfreibetraege"
                inputMode="decimal"
                value={werte.kinderfreibetraege}
                onChange={setzen('kinderfreibetraege')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Kinder unter 25" hint="Senkt die Pflegeversicherung ab dem zweiten Kind.">
              <Input
                name="kinder"
                inputMode="numeric"
                value={werte.kinder}
                onChange={setzen('kinder')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="KV-Zusatzbeitrag in %" hint="Steht auf der Seite der Krankenkasse.">
              <Input
                name="kvzusatz"
                inputMode="decimal"
                value={werte.kvzusatz}
                onChange={setzen('kvzusatz')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Wochenstunden">
              <Input
                name="wochenstunden"
                inputMode="decimal"
                value={werte.wochenstunden}
                onChange={setzen('wochenstunden')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Arbeitstage je Woche">
              <Input
                name="arbeitstage"
                inputMode="numeric"
                value={werte.arbeitstage}
                onChange={setzen('arbeitstage')}
                className="tabular font-mono"
              />
            </Field>

            <Field label="Rechenjahr" className="sm:col-span-2">
              <Select name="steuerjahr" value={werte.steuerjahr} onChange={setzen('steuerjahr')}>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </Select>
            </Field>
          </div>

          <div className="border-border flex items-center gap-3 border-t px-6 py-4">
            <Button type="submit" disabled={pending}>
              <Save />
              {pending ? 'Wird gespeichert …' : 'Angaben speichern'}
            </Button>
            {hinweis ? <span className="text-muted-foreground text-sm">{hinweis}</span> : null}
          </div>
        </Card>
      </form>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="border-border border-b pb-4">
            <CardTitle>Was von der Provision übrig bleibt</CardTitle>
            <CardDescription>
              Gerechnet wird der Aufschlag: Gehalt mit Provision minus Gehalt ohne. Der letzte Euro
              wird höher besteuert als der erste – deshalb ist das die ehrlichere Zahl.
            </CardDescription>
          </CardHeader>

          <div className="p-6">
            <Field label="Provision im Monat (brutto)">
              <Input
                inputMode="decimal"
                value={provision}
                onChange={(e) => setProvision(e.target.value)}
                className="tabular font-mono text-lg"
              />
            </Field>
            <div className="mt-2 flex flex-col gap-1">
              {vorschlaege.map((v) => (
                <button
                  key={v.art}
                  type="button"
                  onClick={() => setProvision(centsAlsEingabe(v.cents))}
                  className="text-primary text-left text-xs font-medium hover:underline"
                >
                  {v.label} ({v.spanne}) übernehmen: {formatEuro(v.cents)}
                </button>
              ))}
            </div>

            <div className="bg-accent-subtle mt-5 rounded-2xl px-5 py-4">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Netto aus der Provision
              </p>
              <p className="tabular text-accent mt-1 font-mono text-3xl font-semibold">
                {formatEuro(ergebnis.provisionNettoCents)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatProzent(ergebnis.nettoQuote)} von {formatEuro(ergebnis.provisionBruttoCents)}{' '}
                brutto
              </p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-border border-b pb-4">
            <CardTitle>Abrechnung des Monats</CardTitle>
            <CardDescription>Grundgehalt und Provision zusammen.</CardDescription>
          </CardHeader>

          <table className="w-full text-sm">
            <tbody className="divide-border divide-y">
              <tr>
                <td className="px-6 py-3 font-medium">Bruttolohn</td>
                <td className="tabular px-6 py-3 text-right font-mono font-semibold">
                  {formatEuro(ergebnis.mit.bruttoCents)}
                </td>
              </tr>
              {zeilen.map((z) => (
                <tr key={z.label} className="text-muted-foreground">
                  <td className="px-6 py-2.5 pl-10">{z.label}</td>
                  <td className="tabular px-6 py-2.5 text-right font-mono">
                    − {formatEuro(z.wert)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/40">
                <td className="px-6 py-3.5 font-semibold">Netto</td>
                <td className="tabular px-6 py-3.5 text-right font-mono text-base font-semibold">
                  {formatEuro(ergebnis.mit.nettoCents)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-muted-foreground border-border border-t px-6 py-3 text-xs">
            Schätzung, keine Lohnabrechnung. Nicht enthalten sind Freibeträge aus den ELStAM,
            Sachbezüge, betriebliche Altersvorsorge und der Sachsen-Zuschlag zur Pflegeversicherung.
            Was wirklich ankommt, steht auf der Abrechnung.
          </p>
        </Card>
      </div>
    </div>
  )
}
