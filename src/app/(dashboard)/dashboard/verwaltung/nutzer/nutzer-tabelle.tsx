'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Power, PowerOff, X } from 'lucide-react'
import type { Role } from '@prisma/client'
import { PASSWORT_MIN } from '@/lib/profil'
import { ROLE_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/utils'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/field'
import { aktivSetzen, passwortZuruecksetzen, rolleSetzen, teamSetzen } from './actions'

export type NutzerZeile = {
  id: string
  email: string
  displayName: string
  role: Role
  active: boolean
  teamId: string | null
  lastLoginAt: Date | null
  avatarVersion: string | null
  buchungen: number
}

/**
 * Die Nutzerliste.
 *
 * Rolle und Team wechseln direkt beim Auswaehlen – kein Speichern-Knopf fuer
 * eine einzelne Auswahl. Das Passwort dagegen braucht einen sichtbaren Schritt:
 * es zu setzen ist nichts, was aus Versehen passieren soll.
 */
export function NutzerTabelle({
  nutzer,
  teams,
  eigeneId,
}: {
  nutzer: NutzerZeile[]
  teams: { id: string; name: string }[]
  eigeneId: string
}) {
  const [offen, setOffen] = useState<string | null>(null)
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [meldung, setMeldung] = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [pending, startTransition] = useTransition()

  function melden(id: string, ergebnis: { ok: boolean; hinweis?: string; fehler?: string }) {
    setMeldung({
      id,
      ok: ergebnis.ok,
      text: ergebnis.ok ? (ergebnis.hinweis ?? 'Gespeichert.') : (ergebnis.fehler ?? 'Fehler.'),
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border border-b pb-4">
        <CardTitle>Konten</CardTitle>
        <CardDescription>
          {nutzer.length} Konten. Wer das Haus verlässt, wird deaktiviert und nicht gelöscht – sonst
          fehlen die Buchungen in der Abrechnung.
        </CardDescription>
      </CardHeader>

      <ul className="divide-border divide-y">
        {nutzer.map((n) => {
          const selbst = n.id === eigeneId
          const zeileMeldung = meldung?.id === n.id ? meldung : null

          return (
            <li key={n.id} className={n.active ? '' : 'bg-muted/30'}>
              <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                <Avatar
                  userId={n.id}
                  displayName={n.displayName}
                  version={n.avatarVersion}
                  className={n.active ? '' : 'opacity-50'}
                />

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {n.displayName}
                    {selbst ? <Badge variant="outline">du</Badge> : null}
                    {n.active ? null : <Badge variant="destructive">deaktiviert</Badge>}
                  </p>
                  <p className="text-muted-foreground truncate font-mono text-xs">{n.email}</p>
                </div>

                <div className="text-muted-foreground hidden w-32 text-xs lg:block">
                  <span className="tabular font-mono">{n.buchungen}</span> Buchungen
                  <br />
                  {n.lastLoginAt ? `zuletzt ${formatDate(n.lastLoginAt)}` : 'nie angemeldet'}
                </div>

                <Select
                  aria-label={`Rolle von ${n.displayName}`}
                  className="h-9 w-44 text-xs"
                  value={n.role}
                  disabled={pending}
                  onChange={(e) => {
                    const rolle = e.target.value as Role
                    startTransition(async () => melden(n.id, await rolleSetzen(n.id, rolle)))
                  }}
                >
                  {(['REP', 'ADMIN'] as const).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>

                <Select
                  aria-label={`Team von ${n.displayName}`}
                  className="h-9 w-36 text-xs"
                  value={n.teamId ?? ''}
                  disabled={pending}
                  onChange={(e) => {
                    const team = e.target.value || null
                    startTransition(async () => melden(n.id, await teamSetzen(n.id, team)))
                  }}
                >
                  <option value="">ohne Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  disabled={pending}
                  title={offen === n.id ? 'Abbrechen' : 'Passwort setzen'}
                  aria-label={`Passwort von ${n.displayName} setzen`}
                  onClick={() => {
                    setNeuesPasswort('')
                    setMeldung(null)
                    setOffen(offen === n.id ? null : n.id)
                  }}
                >
                  {offen === n.id ? <X /> : <KeyRound />}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  // Rot erst beim Zeigen: als Dauerzustand in jeder Zeile waere
                  // die Warnfarbe nur noch Tapete.
                  className="text-muted-foreground hover:text-destructive size-9"
                  disabled={pending || selbst}
                  title={
                    selbst ? 'Das eigene Konto nicht' : n.active ? 'Deaktivieren' : 'Aktivieren'
                  }
                  aria-label={`${n.displayName} ${n.active ? 'deaktivieren' : 'aktivieren'}`}
                  onClick={() => {
                    startTransition(async () => melden(n.id, await aktivSetzen(n.id, !n.active)))
                  }}
                >
                  {n.active ? <PowerOff /> : <Power />}
                </Button>
              </div>

              {offen === n.id ? (
                <div className="bg-secondary/40 flex flex-wrap items-end gap-3 px-6 pb-4">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium">Neues Passwort für {n.displayName}</span>
                    <Input
                      type="text"
                      value={neuesPasswort}
                      minLength={PASSWORT_MIN}
                      autoComplete="off"
                      placeholder={`mindestens ${PASSWORT_MIN} Zeichen`}
                      onChange={(e) => setNeuesPasswort(e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const r = await passwortZuruecksetzen(n.id, neuesPasswort)
                        melden(n.id, r)
                        if (r.ok) {
                          setOffen(null)
                          setNeuesPasswort('')
                        }
                      })
                    }}
                  >
                    Setzen
                  </Button>
                  <p className="text-muted-foreground w-full text-xs">
                    Im Klartext sichtbar, damit du es weitergeben kannst – gespeichert wird nur der
                    Hash. Nicht per Chat oder Mail verschicken.
                  </p>
                </div>
              ) : null}

              {zeileMeldung ? (
                <p
                  role={zeileMeldung.ok ? undefined : 'alert'}
                  className={`px-6 pb-3 text-sm font-medium ${zeileMeldung.ok ? 'text-success' : 'text-destructive'}`}
                >
                  {zeileMeldung.text}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
