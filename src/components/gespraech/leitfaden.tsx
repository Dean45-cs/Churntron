'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MessageSquareQuote,
  ShieldAlert,
  SquareArrowOutUpRight,
} from 'lucide-react'
import { ERSTE_GESPRAECHSPHASE, LEITFADEN, type Block, type Phase } from '@/lib/leitfaden'
import { SCHLUESSEL, abonniere, lies, schreibe } from '@/lib/gespraech-speicher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Der Gespraechsleitfaden.
 *
 * Ein Bauteil fuer drei Huellen: die Vollseite unter /dashboard/gespraech, die
 * Schublade im Dashboard und das eigene Fenster unter /gespraech. Schmal und
 * breit unterscheiden sich ueber Container-Queries (@container), nicht ueber
 * Media-Queries – die Schublade ist schmal, obwohl der Bildschirm breit ist,
 * da greifen Viewport-Breakpoints nicht.
 *
 * Die Leitregel: das Werkzeug hilft, es erzeugt keine Arbeit. Es wird nichts
 * protokolliert, nichts abgehakt, nichts gespeichert ausser der Stelle, an der
 * man gerade steht – und die merkt es sich von selbst.
 */

type Reiter = 'phasen' | 'einwaende'

const LETZTE_PHASE = LEITFADEN.phasen.length - 1

/** Was im Speicher steht, kommt aus dem Browser – also nachrechnen. */
function alsPhase(roh: string) {
  const zahl = Number(roh)
  if (!Number.isInteger(zahl)) return ERSTE_GESPRAECHSPHASE
  return Math.min(Math.max(zahl, 0), LETZTE_PHASE)
}

export function Leitfaden({
  imFenster = false,
  tastaturAktiv = true,
  kopfAktion,
}: {
  /** Im eigenen Fenster faellt der Knopf weg, der das Fenster oeffnet. */
  imFenster?: boolean
  /** In der Schublade nur, solange sie offen ist – sonst horcht sie im Hintergrund mit. */
  tastaturAktiv?: boolean
  /** Platz im Kopf fuer die Huelle – die Schublade haengt hier ihr Schliessen hin. */
  kopfAktion?: React.ReactNode
}) {
  // Der Server kennt die Stelle nicht, an der man steht. useSyncExternalStore
  // rendert deshalb serverseitig den Anfang und schaltet nach der Hydration
  // auf den gemerkten Stand um – ohne Abweichung beim ersten Rendern.
  const nr = alsPhase(
    useSyncExternalStore(
      abonniere,
      () => lies('sitzung', SCHLUESSEL.phase, String(ERSTE_GESPRAECHSPHASE)),
      () => String(ERSTE_GESPRAECHSPHASE),
    ),
  )

  const reiter: Reiter =
    useSyncExternalStore(
      abonniere,
      () => lies('sitzung', SCHLUESSEL.reiter, 'phasen'),
      () => 'phasen',
    ) === 'einwaende'
      ? 'einwaende'
      : 'phasen'

  const geheZu = useCallback((ziel: number) => {
    schreibe('sitzung', SCHLUESSEL.phase, String(Math.min(Math.max(ziel, 0), LETZTE_PHASE)))
    schreibe('sitzung', SCHLUESSEL.reiter, 'phasen')
  }, [])

  const wechsleReiter = useCallback((ziel: Reiter) => {
    schreibe('sitzung', SCHLUESSEL.reiter, ziel)
  }, [])

  // Beim Telefonieren ist eine Hand am Hoerer. Pfeiltasten blaettern, "e" holt
  // die Einwaende und bringt einen wieder zurueck.
  useEffect(() => {
    if (!tastaturAktiv) return

    function beiTaste(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const ziel = e.target as HTMLElement | null
      if (ziel?.isContentEditable) return
      if (ziel && /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName)) return

      if (e.key === 'ArrowRight') geheZu(nr + 1)
      else if (e.key === 'ArrowLeft') geheZu(nr - 1)
      else if (e.key === 'e' || e.key === 'E') {
        wechsleReiter(reiter === 'einwaende' ? 'phasen' : 'einwaende')
      } else return

      e.preventDefault()
    }

    window.addEventListener('keydown', beiTaste)
    return () => window.removeEventListener('keydown', beiTaste)
  }, [tastaturAktiv, nr, reiter, geheZu, wechsleReiter])

  const phase = LEITFADEN.phasen[nr] ?? LEITFADEN.phasen[ERSTE_GESPRAECHSPHASE]

  function eigenesFenster() {
    // Benanntes Fenster: ein zweiter Klick holt das bestehende nach vorn,
    // statt ein zweites daneben zu stellen.
    const fenster = window.open('/gespraech', 'churntron-gespraech', 'popup=1,width=460,height=920')
    fenster?.focus()
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      {/* --- Kopf: Titel und die zwei Reiter ------------------------------- */}
      <div className="border-border shrink-0 border-b px-4 pt-4 pb-0 @2xl:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base leading-tight font-semibold @2xl:text-lg">
              {LEITFADEN.titel}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">{LEITFADEN.einsatz}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {imFenster ? null : (
              <Button
                variant="outline"
                size="sm"
                onClick={eigenesFenster}
                title="Als eigenes Fenster öffnen – zum Danebenlegen neben das Lookup-Tool"
              >
                <SquareArrowOutUpRight />
                <span className="hidden @sm:inline">Eigenes Fenster</span>
              </Button>
            )}
            {kopfAktion}
          </div>
        </div>

        <div className="mt-3 flex gap-1" role="tablist" aria-label="Bereiche des Leitfadens">
          {(
            [
              ['phasen', 'Phasen', null],
              ['einwaende', 'Einwände', MessageSquareQuote],
            ] as const
          ).map(([wert, beschriftung, Icon]) => (
            <button
              key={wert}
              type="button"
              role="tab"
              aria-selected={reiter === wert}
              onClick={() => wechsleReiter(wert)}
              className={cn(
                'flex items-center gap-1.5 rounded-t-xl border-b-2 px-3.5 py-2 text-sm font-medium transition-colors',
                reiter === wert
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {Icon ? <Icon className="size-4" /> : null}
              {beschriftung}
            </button>
          ))}
        </div>
      </div>

      {/* --- Mitte: Phasen oder Einwaende ---------------------------------- */}
      {reiter === 'einwaende' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 @2xl:px-6">
          <EinwandListe />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] @2xl:grid-cols-[13.5rem_minmax(0,1fr)] @2xl:grid-rows-[minmax(0,1fr)]">
          <div className="border-border bg-muted/30 flex min-h-0 flex-col border-b @2xl:overflow-y-auto @2xl:border-r @2xl:border-b-0">
            <PhasenLeiste nr={nr} geheZu={geheZu} />
            <Weiterentwicklung />
          </div>

          <div className="min-h-0 overflow-y-auto px-4 py-4 @2xl:px-6 @2xl:py-5">
            <PhasenKopf phase={phase} />
            <div className="mt-4 flex flex-col gap-4">
              {phase.bloecke.map((block, i) => (
                <BlockAnsicht key={i} block={block} />
              ))}
            </div>
          </div>
        </div>
      )}

      <Leitplanken />
    </div>
  )
}

/**
 * Die Phasenleiste. Schmal eine Zeile mit Nummern und Blaetterknoepfen, breit
 * eine Liste mit Namen. Ein DOM-Baum, zwei Formen – sonst laufen die beiden
 * Darstellungen frueher oder spaeter auseinander.
 */
function PhasenLeiste({ nr, geheZu }: { nr: number; geheZu: (ziel: number) => void }) {
  const aktiverKnopf = useRef<HTMLButtonElement | null>(null)

  // Schmal laeuft die Leiste waagerecht und scrollt. Wer mit den Pfeiltasten
  // blaettert, haelt den Fokus nicht auf dem Knopf – ohne das hier waere die
  // aktive Phase ab der neunten aus dem Bild.
  useEffect(() => {
    aktiverKnopf.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [nr])

  return (
    <nav
      aria-label="Phasen des Gesprächs"
      className="flex shrink-0 items-center gap-1 px-3 py-2 @2xl:flex-col @2xl:items-stretch @2xl:gap-0.5 @2xl:px-3 @2xl:py-4"
    >
      <button
        type="button"
        onClick={() => geheZu(nr - 1)}
        disabled={nr === 0}
        aria-label="Vorige Phase"
        className="hover:bg-secondary grid size-8 shrink-0 place-items-center rounded-lg disabled:opacity-30 @2xl:hidden"
      >
        <ChevronLeft className="size-4" />
      </button>

      <ol className="flex min-w-0 flex-1 gap-1 overflow-x-auto @2xl:flex-col @2xl:gap-0.5 @2xl:overflow-visible">
        {LEITFADEN.phasen.map((p) => {
          const aktiv = p.nr === nr
          // 0 und 10 laufen nicht am Telefon – sie stehen sichtbar abgesetzt.
          const amTelefon = p.moment === 'gespraech'
          return (
            <li key={p.nr} className="@2xl:w-full">
              <button
                type="button"
                ref={aktiv ? aktiverKnopf : null}
                onClick={() => geheZu(p.nr)}
                aria-current={aktiv ? 'step' : undefined}
                title={`Phase ${p.nr} · ${p.titel}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg text-sm font-medium transition-colors',
                  'size-8 shrink-0 justify-center @2xl:h-auto @2xl:w-full @2xl:justify-start @2xl:px-2.5 @2xl:py-1.5',
                  aktiv
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  !aktiv && !amTelefon && 'opacity-60',
                )}
              >
                <span className={cn('tabular font-mono text-xs', aktiv && 'font-bold')}>
                  {p.nr}
                </span>
                <span className="hidden truncate @2xl:inline">{p.kurz}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={() => geheZu(nr + 1)}
        disabled={nr === LETZTE_PHASE}
        aria-label="Nächste Phase"
        className="hover:bg-secondary grid size-8 shrink-0 place-items-center rounded-lg disabled:opacity-30 @2xl:hidden"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  )
}

function PhasenKopf({ phase }: { phase: Phase }) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Phase {phase.nr}
        </span>
        {phase.moment === 'vorher' ? <Badge variant="outline">vor dem Anruf</Badge> : null}
        {phase.moment === 'danach' ? <Badge variant="outline">nach dem Anruf</Badge> : null}
      </div>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">{phase.titel}</h3>
      {phase.zusatz ? <p className="text-muted-foreground text-sm">{phase.zusatz}</p> : null}
      {phase.ziel ? (
        <p className="border-primary/40 mt-3 border-l-2 pl-3 text-sm">
          <span className="font-semibold">Ziel: </span>
          {phase.ziel}
        </p>
      ) : null}
    </header>
  )
}

function BlockAnsicht({ block }: { block: Block }) {
  switch (block.art) {
    case 'text':
      return (
        <div>
          {block.titel ? <Ueberschrift>{block.titel}</Ueberschrift> : null}
          <p className="text-sm leading-relaxed">{block.text}</p>
        </div>
      )

    case 'oTon':
      // Der Satz, der wirklich vorgelesen wird. Das Auge muss ihn in einer
      // Sekunde finden – deshalb ist das die einzige Stelle im Leitfaden, an
      // der Orange auftaucht.
      return (
        <blockquote className="border-accent bg-accent-subtle rounded-r-xl border-l-4 py-2.5 pr-3 pl-4">
          {block.wann ? (
            <p className="text-muted-foreground mb-1 text-xs font-semibold">{block.wann}</p>
          ) : null}
          <p className="text-[0.95rem] leading-relaxed font-medium">&bdquo;{block.satz}&ldquo;</p>
        </blockquote>
      )

    case 'schritte':
      return (
        <div>
          {block.titel ? <Ueberschrift>{block.titel}</Ueberschrift> : null}
          <ol className="flex flex-col gap-2">
            {block.punkte.map((punkt, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="bg-secondary text-secondary-foreground tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold">
                  {i + 1}
                </span>
                <span>{punkt}</span>
              </li>
            ))}
          </ol>
        </div>
      )

    case 'zuordnung':
      // Bewusst eine Definitionsliste und keine Tabelle: bei 380 px Breite
      // bricht eine zweispaltige Tabelle unlesbar um.
      return (
        <div>
          <Ueberschrift>
            {block.spalten[0]} <span className="text-muted-foreground">→</span> {block.spalten[1]}
          </Ueberschrift>
          <dl className="divide-border border-border divide-y overflow-hidden rounded-xl border">
            {block.zeilen.map((zeile) => (
              <div key={zeile.nach} className="px-3 py-2">
                <dt className="text-muted-foreground text-sm">{zeile.von}</dt>
                <dd className="text-sm font-semibold">{zeile.nach}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

    case 'stufen':
      return (
        <div>
          {block.titel ? <Ueberschrift>{block.titel}</Ueberschrift> : null}
          <ol className="flex flex-col gap-1.5">
            {block.punkte.map((punkt, i) => (
              <li
                key={i}
                className="border-border flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm"
              >
                <Badge variant={i === 0 ? 'success' : i === 1 ? 'default' : 'accentSubtle'}>
                  Stufe {i + 1}
                </Badge>
                <span className="min-w-0">{punkt}</span>
              </li>
            ))}
          </ol>
        </div>
      )

    case 'einwaende':
      return <EinwandListe />

    case 'luecke':
      return (
        <div className="bg-muted/50 border-border flex gap-2.5 rounded-xl border border-dashed px-3 py-2.5">
          <Badge variant="outline" className="mt-0.5 h-fit shrink-0">
            folgt
          </Badge>
          <p className="text-muted-foreground text-xs leading-relaxed">{block.text}</p>
        </div>
      )
  }
}

/**
 * Die Einwaende. Sie stehen einmal in leitfaden.ts und erscheinen zweimal:
 * in Phase 7 und im eigenen Reiter. Der Reiter ist der wichtigere Weg – der
 * Kunde bringt einen Einwand, wann er will, nicht wenn das Skript so weit ist.
 */
function EinwandListe() {
  return (
    <ul className="flex flex-col gap-2.5">
      {LEITFADEN.einwaende.map((e) => (
        <li key={e.einwand} className="border-border overflow-hidden rounded-xl border">
          <p className="bg-muted/50 border-border border-b px-3 py-2 text-sm font-semibold">
            &bdquo;{e.einwand}&ldquo;
          </p>
          <p className="px-3 py-2.5 text-sm leading-relaxed">&bdquo;{e.antwort}&ldquo;</p>
          {e.hinweis ? (
            <p className="text-muted-foreground px-3 pb-2 text-xs">{e.hinweis}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Die vier Leitplanken. Das Dokument sagt "gelten in jeder Phase" – also
 * stehen sie in jeder Phase da und nicht auf einer eigenen Seite.
 */
function Leitplanken() {
  return (
    <footer className="border-border bg-muted/40 shrink-0 border-t px-4 py-2.5 @2xl:px-6 @2xl:py-3">
      <p className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <ShieldAlert className="size-3.5" />
        Leitplanken
      </p>
      <ul className="flex flex-col gap-1 @2xl:flex-row @2xl:flex-wrap @2xl:gap-x-6">
        {LEITFADEN.leitplanken.map((l) => (
          <li key={l.regel} className="text-xs leading-snug">
            <span className="font-semibold">{l.regel}</span>
            {l.grund ? (
              <span className="text-muted-foreground hidden @2xl:inline"> {l.grund}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </footer>
  )
}

/**
 * Woran am Leitfaden noch gearbeitet wird. Das gehoert zum Dokument, nicht zu
 * einer einzelnen Phase – deshalb steht es einmal unter der Phasenliste und
 * nicht unter jedem Inhalt. Nur in der breiten Ansicht: waehrend eines
 * Gespraechs ist das Rauschen, beim Durchgehen mit dem Ausbilder nicht.
 */
function Weiterentwicklung() {
  return (
    // <details> statt eigenem Aufklapp-Zustand: das kann der Browser, und es
    // spart eine Client-Grenze. Zu ist der Normalfall – aufgeklappt wird das
    // hier nur, wenn jemand den Leitfaden bespricht.
    <details className="border-border group mt-2 hidden shrink-0 border-t px-3 pt-3 pb-4 @2xl:block">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold tracking-wide uppercase [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        Noch offen
      </summary>
      <p className="text-muted-foreground mt-2 mb-2 text-xs">{LEITFADEN.stand}</p>
      <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4 text-xs">
        {LEITFADEN.weiterentwicklung.map((punkt) => (
          <li key={punkt}>{punkt}</li>
        ))}
      </ul>
    </details>
  )
}

function Ueberschrift({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
      {children}
    </p>
  )
}
