'use client'

import { ChevronRight, Check, Flag, Mail, ExternalLink, Copy, CopyCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { dublettenText, type Dublette } from '@/lib/lookup/dubletten'
import type { LookupRecord, StatusWert } from '@/lib/lookup/types'
import { cn } from '@/lib/utils'
import { NotizFeld } from './notiz-feld'

/** Ein Partner-Eintrag derselben Dubletten-Gruppe, fertig beschriftet. */
export type DublettenPartner = { bezeichnung: string; suche: string }

/**
 * Eine Karte je Datensatz. Zugeklappt steht dort, was fuer den Anruf reicht:
 * Waehlnummer, Name, Vertrags- bzw. Kundennummer. Alles Weitere kommt erst
 * beim Aufklappen – sonst passen auf einen Handy-Bildschirm drei Kunden.
 *
 * Alle Werte kommen aus der Quelldatei und laufen ueber JSX, also ueber
 * Textknoten. Kein dangerouslySetInnerHTML, nirgends – im alten Tool war das
 * eine ausdruecklich dokumentierte Zusage, und sie gilt hier weiter.
 */

function Zeile({
  label,
  wert,
  mono,
  onCopy,
  aktion,
}: {
  label: string
  wert: string
  mono?: boolean
  onCopy: (wert: string) => void
  aktion?: React.ReactNode
}) {
  if (!wert) return null
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCopy(wert)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCopy(wert)
        }
      }}
      title="Klicken zum Kopieren"
      className="border-border/60 hover:bg-muted/40 flex cursor-pointer items-baseline gap-3 border-t px-5 py-2.5 text-left"
    >
      <span className="text-muted-foreground w-28 shrink-0 pt-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
        {label}
      </span>
      <span className={cn('flex-1 text-sm leading-snug break-words', mono && 'tabular font-mono')}>
        {wert}
      </span>
      {aktion}
    </div>
  )
}

export function LookupKarte({
  record,
  status,
  notiz,
  offen,
  dublette,
  partner,
  onToggleOffen,
  onStatus,
  onNotiz,
  onCopy,
  onSpringeZu,
}: {
  record: LookupRecord
  status: StatusWert
  notiz: string
  offen: boolean
  /** Gesetzt, wenn derselbe Anschluss mehrfach in der Liste steht. */
  dublette?: Dublette
  /** Die uebrigen Eintraege der Gruppe, beschriftet und anspringbar. */
  partner?: DublettenPartner[]
  onToggleOffen: () => void
  onStatus: (st: Exclude<StatusWert, ''>) => void
  onNotiz: (wert: string) => void
  onCopy: (wert: string) => void
  onSpringeZu: (suche: string) => void
}) {
  const r = record
  const dials = r.dials.length ? r.dials : r.dial ? [r.dial] : []
  const unterzeile = [r.vertrag && `Vertrag ${r.vertrag}`, r.kdn && `KdNr ${r.kdn}`, r.jira?.label]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={cn(
        'bg-card border-border overflow-hidden rounded-2xl border shadow-[var(--shadow-raised)] transition-shadow',
        status === 'done' && 'border-l-success border-l-4',
        status === 'check' && 'border-l-accent border-l-4',
      )}
    >
      {/*
        Auf dem Handy bekommt der Name eine eigene Zeile: Nummer, Name und die
        beiden Status-Tasten nebeneinander lassen bei 400px nur "Ann…" uebrig,
        und der Name ist das, was waehrend des Klingelns gelesen wird.
        Ab sm steht wieder alles in einer Zeile.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
        {dials.length ? (
          <button
            type="button"
            onClick={() => onCopy(dials[0]!)}
            title="Nummer kopieren"
            className={cn(
              'bg-success-subtle text-success focus-visible:ring-ring tabular order-1 shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-base font-semibold outline-none focus-visible:ring-2',
              status === 'done' && 'opacity-70',
            )}
          >
            {dials[0]}
            {dials.length > 1 ? (
              <span className="bg-success text-success-subtle ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold">
                +{dials.length - 1}
              </span>
            ) : null}
          </button>
        ) : (
          <span className="bg-destructive/10 text-destructive order-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
            keine Nummer
          </span>
        )}

        <button
          type="button"
          onClick={onToggleOffen}
          aria-expanded={offen}
          className="order-3 w-full min-w-0 text-left sm:order-2 sm:w-auto sm:flex-1"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-semibold',
                status === 'done' && 'text-muted-foreground line-through',
              )}
            >
              {r.name || '—'}
            </span>
            {dublette ? (
              // Vor dem Waehlen sichtbar, nicht erst beim Aufklappen – sonst
              // kommt der Hinweis nach dem Anruf.
              <Badge variant="accentSubtle" className="shrink-0" title={dublettenText(dublette)}>
                <CopyCheck className="size-3" />
                {dublette.partner.length + 1}×
              </Badge>
            ) : null}
          </span>
          <span className="text-muted-foreground block truncate text-xs">{unterzeile}</span>
        </button>

        <span className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:order-3 sm:ml-0">
          <button
            type="button"
            onClick={() => onStatus('done')}
            aria-pressed={status === 'done'}
            title="Erledigt"
            className={cn(
              'focus-visible:ring-ring grid size-8 place-items-center rounded-lg border outline-none focus-visible:ring-2',
              status === 'done'
                ? 'bg-success border-success text-white'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onStatus('check')}
            aria-pressed={status === 'check'}
            title="Noch zu prüfen"
            className={cn(
              'focus-visible:ring-ring grid size-8 place-items-center rounded-lg border outline-none focus-visible:ring-2',
              status === 'check'
                ? 'bg-accent border-accent text-accent-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            <Flag className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToggleOffen}
            aria-label={offen ? 'Zuklappen' : 'Aufklappen'}
            className="text-muted-foreground ml-1"
          >
            <ChevronRight className={cn('size-5 transition-transform', offen && 'rotate-90')} />
          </button>
        </span>
      </div>

      {offen ? (
        <div>
          {dials.length ? (
            <div className="border-border/60 flex items-baseline gap-3 border-t px-5 py-2.5">
              <span className="text-muted-foreground w-28 shrink-0 pt-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
                Wählnummer{dials.length > 1 ? 'n' : ''}
              </span>
              <span className="flex flex-1 flex-wrap gap-1.5">
                {dials.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onCopy(d)}
                    className="bg-success-subtle text-success tabular rounded-lg px-2 py-1 font-mono text-sm font-semibold"
                  >
                    {d}
                  </button>
                ))}
              </span>
            </div>
          ) : null}

          {dublette && partner?.length ? (
            <div className="border-border/60 bg-accent-subtle flex flex-wrap items-baseline gap-x-3 gap-y-2 border-t px-5 py-3">
              <span className="text-muted-foreground w-28 shrink-0 pt-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
                Dublette
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{dublettenText(dublette)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {partner.map((p) => (
                    <button
                      key={p.bezeichnung + p.suche}
                      type="button"
                      onClick={() => onSpringeZu(p.suche)}
                      title="In der Liste anzeigen"
                      className="border-border bg-card hover:bg-secondary focus-visible:ring-ring rounded-lg border px-2 py-1 text-xs font-semibold outline-none focus-visible:ring-2"
                    >
                      {p.bezeichnung}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <Zeile label="Telefon (Original)" wert={r.telRaw} mono onCopy={onCopy} />
          <Zeile label="Kundennummer" wert={r.kdn} mono onCopy={onCopy} />

          {r.jira ? (
            <div className="border-border/60 bg-secondary/40 flex items-baseline gap-3 border-t px-5 py-2.5">
              <span className="text-muted-foreground w-28 shrink-0 text-[10.5px] font-semibold tracking-wide uppercase">
                Jira
              </span>
              <a
                href={r.jira.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex-1 text-sm font-semibold break-all hover:underline"
              >
                {r.jira.label}
                <ExternalLink className="ml-1 inline size-3.5 align-[-2px]" />
              </a>
              <button
                type="button"
                onClick={() => onCopy(r.jira!.url)}
                title="Link kopieren"
                className="text-primary hover:bg-secondary rounded-md p-1"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          ) : null}

          {r.kommentar ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onCopy(r.kommentar)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onCopy(r.kommentar)
                }
              }}
              className="border-border/60 bg-accent-subtle flex cursor-pointer gap-3 border-t px-5 py-3"
            >
              <span className="text-muted-foreground w-28 shrink-0 pt-0.5 text-[10.5px] font-semibold tracking-wide uppercase">
                Kommentar
              </span>
              <span className="flex-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {r.kommentar}
              </span>
            </div>
          ) : null}

          <Zeile
            label="E-Mail"
            wert={r.email}
            onCopy={onCopy}
            aktion={
              r.email ? (
                <a
                  href={`mailto:${r.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:bg-secondary rounded-md p-1"
                  title="Mail schreiben"
                >
                  <Mail className="size-3.5" />
                </a>
              ) : undefined
            }
          />
          <Zeile label="Anschlussadresse" wert={r.address} onCopy={onCopy} />
          <Zeile label="Vertrag" wert={r.vertrag} mono onCopy={onCopy} />
          <Zeile label="Produkt" wert={r.produkt} onCopy={onCopy} />
          <Zeile label="Geschäftsfall" wert={r.gfall} onCopy={onCopy} />
          <Zeile label="Ursache" wert={r.ursache} onCopy={onCopy} />

          {r.extras.map((e) => (
            <Zeile key={e.header} label={e.header} wert={e.value} onCopy={onCopy} />
          ))}

          <NotizFeld notiz={notiz} onChange={onNotiz} />
        </div>
      ) : null}
    </div>
  )
}
