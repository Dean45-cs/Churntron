'use client'

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  Search,
  ThumbsUp,
  X,
} from 'lucide-react'
import type { ObjectionCategory } from '@prisma/client'
import type { WikiEintrag } from '@/lib/queries'
import { indexieren, suchen } from '@/lib/objection-search'
import { OBJECTION_CATEGORIES, OBJECTION_CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EinwandForm } from './einwand-form'
import { einwandArchivieren, hatGeholfen } from './actions'

/**
 * Die Wiki im Betrieb: ein Suchfeld, darunter die Treffer.
 *
 * Gesucht wird im Browser (siehe src/lib/objection-search.ts) – waehrend eines
 * Telefonats soll zwischen Tastendruck und Treffer keine Netzrunde liegen.
 * Deshalb kommt der gesamte Bestand einmal vom Server und wird hier bewertet.
 *
 * Die Liste ist zweigeteilt, und zwar zuerst danach, WO der Treffer sitzt:
 * Passt der Einwand selbst – Ueberschrift, Formulierung, Schlagwort, Thema –,
 * steht der Eintrag oben. Faellt das Stichwort nur irgendwo im Antworttext,
 * steht er unter „Vielleicht auch passend", zusammen mit dem, was gemessen am
 * besten Treffer kaum noch ins Gewicht faellt. So bleibt die Suche
 * grosszuegig, ohne alles gleich wichtig zu machen.
 */

/** Unter einem Zehntel des besten Treffers ist es ein Hinweis, kein Treffer. */
const RANDSCHWELLE = 0.1

type Zeile = { eintrag: WikiEintrag; kern: boolean; relevanz: number; themen: string[] }

export function WikiSuche({ eintraege }: { eintraege: WikiEintrag[] }) {
  const [begriff, setBegriff] = useState('')
  const [kategorie, setKategorie] = useState<ObjectionCategory | null>(null)
  const [imArchiv, setImArchiv] = useState(false)
  const [neuOffen, setNeuOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [handOffen, setHandOffen] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const [geholfen, merkeGeholfen] = useOptimistic<string[], string>([], (liste, id) => [
    ...liste,
    id,
  ])
  const suchfeld = useRef<HTMLInputElement>(null)

  // Die Suche ist das Erste, worauf die Hand landet – auch beim zweiten Anruf.
  useEffect(() => {
    suchfeld.current?.focus()
  }, [])

  // Schrägstrich springt ins Suchfeld, egal wo der Fokus gerade steht.
  useEffect(() => {
    function beiTaste(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return
      const ziel = event.target as HTMLElement | null
      if (ziel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ziel.tagName)) return
      event.preventDefault()
      suchfeld.current?.focus()
      suchfeld.current?.select()
    }
    document.addEventListener('keydown', beiTaste)
    return () => document.removeEventListener('keydown', beiTaste)
  }, [])

  // Archivierte Eintraege kommen mit, tauchen in der Suche aber nur auf, wenn
  // man ausdruecklich ins Archiv schaut – sonst waeren sie nie zurueckzuholen.
  const sichtbar = useMemo(
    () => eintraege.filter((e) => e.archived === imArchiv),
    [eintraege, imArchiv],
  )
  const archivAnzahl = useMemo(() => eintraege.filter((e) => e.archived).length, [eintraege])

  const index = useMemo(() => indexieren(sichtbar), [sichtbar])
  const gesucht = begriff.trim().length > 0

  const zeilen: Zeile[] = useMemo(() => {
    const roh: Zeile[] = gesucht
      ? suchen(index, begriff)
      : sichtbar.map((eintrag) => ({ eintrag, kern: true, relevanz: 1, themen: [] }))
    return kategorie ? roh.filter((z) => z.eintrag.category === kategorie) : roh
  }, [index, sichtbar, begriff, gesucht, kategorie])

  // Trifft nichts den Einwand selbst, taugen auch die Fundstellen im Antworttext
  // als Ergebnis – ein Suchbegriff, der nur dort steht, soll nicht wie ein
  // Zufallsfund aussehen.
  const stark = (z: Zeile) => z.kern && z.relevanz >= RANDSCHWELLE
  const nurRand = zeilen.length > 0 && !zeilen.some(stark)
  const treffer = nurRand ? zeilen : zeilen.filter(stark)
  const randtreffer = nurRand ? [] : zeilen.filter((z) => !stark(z))

  // Welche Themen der Bestand ueberhaupt hergibt – leere Filter helfen niemandem.
  const vorhandeneThemen = useMemo(() => {
    const gezaehlt = new Map<ObjectionCategory, number>()
    for (const e of sichtbar) gezaehlt.set(e.category, (gezaehlt.get(e.category) ?? 0) + 1)
    return OBJECTION_CATEGORIES.filter((k) => gezaehlt.has(k)).map((k) => ({
      kategorie: k,
      anzahl: gezaehlt.get(k)!,
    }))
  }, [sichtbar])

  function melden(ergebnis: { ok: boolean; hinweis?: string; fehler?: string }) {
    setFehler(ergebnis.ok ? null : (ergebnis.fehler ?? 'Das hat nicht geklappt.'))
    setHinweis(ergebnis.ok ? (ergebnis.hinweis ?? null) : null)
  }

  function geholfenMelden(id: string) {
    startTransition(async () => {
      merkeGeholfen(id)
      const ergebnis = await hatGeholfen(id)
      if (!ergebnis.ok) melden(ergebnis)
    })
  }

  function archivieren(id: string, insArchiv: boolean) {
    startTransition(async () => {
      melden(await einwandArchivieren(id, insArchiv))
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <input
            ref={suchfeld}
            value={begriff}
            onChange={(e) => setBegriff(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBegriff('')
            }}
            type="text"
            placeholder="Was hat der Kunde gesagt? z. B. zu teuer"
            aria-label="Einwand suchen"
            className="border-input bg-card focus-visible:ring-ring h-13 w-full rounded-2xl border pr-12 pl-11 text-base outline-none focus-visible:ring-2"
          />
          {begriff ? (
            <button
              type="button"
              onClick={() => {
                setBegriff('')
                suchfeld.current?.focus()
              }}
              aria-label="Suche leeren"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="text-muted-foreground border-border pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 font-mono text-xs sm:block">
              /
            </kbd>
          )}
        </div>

        <Button
          variant={neuOffen ? 'outline' : 'accent'}
          onClick={() => {
            setNeuOffen((offen) => !offen)
            setBearbeitet(null)
            setHinweis(null)
          }}
        >
          {neuOffen ? <X /> : <Plus />}
          {neuOffen ? 'Schließen' : 'Neu'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip aktiv={kategorie === null} onClick={() => setKategorie(null)}>
          Alle <span className="tabular opacity-70">{sichtbar.length}</span>
        </Chip>
        {vorhandeneThemen.map(({ kategorie: k, anzahl }) => (
          <Chip
            key={k}
            aktiv={kategorie === k}
            onClick={() => setKategorie(kategorie === k ? null : k)}
          >
            {OBJECTION_CATEGORY_LABEL[k]} <span className="tabular opacity-70">{anzahl}</span>
          </Chip>
        ))}
        {archivAnzahl > 0 ? (
          <Chip
            aktiv={imArchiv}
            onClick={() => {
              setImArchiv((wert) => !wert)
              setKategorie(null)
            }}
          >
            <Archive className="size-3.5" />
            Archiv <span className="tabular opacity-70">{archivAnzahl}</span>
          </Chip>
        ) : null}
      </div>

      {neuOffen ? (
        <EinwandForm
          titelVorschlag={gesucht ? begriff.trim() : undefined}
          onFertig={(h) => {
            setNeuOffen(false)
            setHinweis(h ?? null)
          }}
          onAbbrechen={() => setNeuOffen(false)}
        />
      ) : null}

      {hinweis ? (
        <p className="text-success bg-success-subtle rounded-xl px-4 py-2.5 text-sm font-medium">
          {hinweis}
        </p>
      ) : null}
      {fehler ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {fehler}
        </p>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {gesucht ? (
          <>
            <span className="text-foreground font-semibold">{treffer.length}</span> Treffer für
            &bdquo;{begriff.trim()}&ldquo;
            {randtreffer.length > 0 ? `, ${randtreffer.length} entfernt verwandt` : ''}
          </>
        ) : (
          <>
            {zeilen.length} {zeilen.length === 1 ? 'Einwandbehandlung' : 'Einwandbehandlungen'}
            {kategorie ? ` zum Thema ${OBJECTION_CATEGORY_LABEL[kategorie]}` : ''}
            {imArchiv ? ' im Archiv' : ' – bewährte zuerst'}
          </>
        )}
      </p>

      <div className="flex flex-col gap-3">
        {treffer.map((zeile, i) => (
          <EintragKarte
            key={zeile.eintrag.id}
            zeile={zeile}
            offen={handOffen[zeile.eintrag.id] ?? (gesucht && i === 0)}
            aufklappen={(auf) => setHandOffen((s) => ({ ...s, [zeile.eintrag.id]: auf }))}
            imFormular={bearbeitet === zeile.eintrag.id}
            bearbeiten={() => {
              setBearbeitet(zeile.eintrag.id)
              setNeuOffen(false)
            }}
            abbrechen={() => setBearbeitet(null)}
            gespeichert={(h) => {
              setBearbeitet(null)
              setHinweis(h ?? null)
            }}
            zusatzHilfe={geholfen.filter((g) => g === zeile.eintrag.id).length}
            geholfenMelden={() => geholfenMelden(zeile.eintrag.id)}
            archivieren={(auf) => archivieren(zeile.eintrag.id, auf)}
          />
        ))}

        {treffer.length === 0 ? (
          <Card className="px-6 py-10 text-center">
            <p className="font-medium">
              {gesucht
                ? `Kein Treffer für „${begriff.trim()}“.`
                : imArchiv
                  ? 'Das Archiv ist leer.'
                  : 'Hier ist noch nichts.'}
            </p>
            <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm">
              Dann fehlt sie noch. Was in diesem Gespräch funktioniert hat, hilft beim nächsten Mal
              dem ganzen Team.
            </p>
            <Button
              variant="accent"
              className="mt-4"
              onClick={() => {
                setNeuOffen(true)
                setBearbeitet(null)
              }}
            >
              <Plus />
              Einwandbehandlung anlegen
            </Button>
          </Card>
        ) : null}

        {randtreffer.length > 0 ? (
          <>
            <p className="text-muted-foreground mt-3 px-1 text-xs font-semibold tracking-wide uppercase">
              Vielleicht auch passend
            </p>
            {randtreffer.map((zeile) => (
              <EintragKarte
                key={zeile.eintrag.id}
                zeile={zeile}
                offen={handOffen[zeile.eintrag.id] ?? false}
                aufklappen={(auf) => setHandOffen((s) => ({ ...s, [zeile.eintrag.id]: auf }))}
                imFormular={bearbeitet === zeile.eintrag.id}
                bearbeiten={() => setBearbeitet(zeile.eintrag.id)}
                abbrechen={() => setBearbeitet(null)}
                gespeichert={(h) => {
                  setBearbeitet(null)
                  setHinweis(h ?? null)
                }}
                zusatzHilfe={geholfen.filter((g) => g === zeile.eintrag.id).length}
                geholfenMelden={() => geholfenMelden(zeile.eintrag.id)}
                archivieren={(auf) => archivieren(zeile.eintrag.id, auf)}
              />
            ))}
          </>
        ) : null}
      </div>
    </div>
  )
}

function Chip({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        aktiv
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function EintragKarte({
  zeile,
  offen,
  aufklappen,
  imFormular,
  bearbeiten,
  abbrechen,
  gespeichert,
  zusatzHilfe,
  geholfenMelden,
  archivieren,
}: {
  zeile: Zeile
  offen: boolean
  aufklappen: (auf: boolean) => void
  imFormular: boolean
  bearbeiten: () => void
  abbrechen: () => void
  gespeichert: (hinweis?: string) => void
  zusatzHilfe: number
  geholfenMelden: () => void
  archivieren: (auf: boolean) => void
}) {
  const { eintrag, themen } = zeile
  const [kopiert, setKopiert] = useState(false)

  // „Thema: Preis" neben dem Preis-Einwand sagt nichts. Genannt wird nur, was
  // der Ueberschrift etwas hinzufuegt – der Umweg, ueber den der Treffer kam.
  const weitereThemen = themen.filter((t) => t !== eintrag.kategorieLabel)

  if (imFormular) {
    return <EinwandForm eintrag={eintrag} onFertig={gespeichert} onAbbrechen={abbrechen} />
  }

  const volltext = eintrag.followUp ? `${eintrag.answer}\n\n${eintrag.followUp}` : eintrag.answer

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(volltext)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    } catch {
      // Ohne Zwischenablage-Recht bleibt der Text markierbar – kein Grund zu stoeren.
    }
  }

  return (
    <Card className={cn('overflow-hidden', eintrag.archived && 'opacity-70')}>
      <button
        type="button"
        onClick={() => aufklappen(!offen)}
        aria-expanded={offen}
        className="hover:bg-muted/30 flex w-full items-start gap-3 px-6 py-4 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{eintrag.title}</span>
            <Badge variant="outline">{eintrag.kategorieLabel}</Badge>
            {eintrag.archived ? <Badge variant="destructive">Archiv</Badge> : null}
            {weitereThemen.length > 0 ? (
              <Badge variant="accentSubtle">über {weitereThemen.join(' · ')}</Badge>
            ) : null}
            {eintrag.helpful + zusatzHilfe > 0 ? (
              <Badge variant="success" className="tabular font-mono">
                {eintrag.helpful + zusatzHilfe}× geholfen
              </Badge>
            ) : null}
          </div>

          {!offen ? (
            <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">{eintrag.answer}</p>
          ) : null}
        </div>

        <ChevronDown
          className={cn(
            'text-muted-foreground mt-1 size-4 shrink-0 transition-transform',
            offen && 'rotate-180',
          )}
        />
      </button>

      {offen ? (
        <div className="border-border border-t px-6 py-5">
          <p className="text-[0.95rem] leading-relaxed whitespace-pre-line">{eintrag.answer}</p>

          {eintrag.followUp ? (
            <p className="bg-accent-subtle text-accent mt-4 rounded-xl px-4 py-3 text-sm font-medium">
              {eintrag.followUp}
            </p>
          ) : null}

          {eintrag.variants.length > 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              <span className="font-medium">Klingt auch so:</span>{' '}
              {eintrag.variants.map((v) => `„${v}“`).join(' · ')}
            </p>
          ) : null}

          {eintrag.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {eintrag.tags.map((t) => (
                <Badge key={t} variant="default">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="border-border mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button variant="outline" size="sm" onClick={geholfenMelden}>
              <ThumbsUp />
              Hat geholfen
            </Button>
            <Button variant="ghost" size="sm" onClick={kopieren}>
              {kopiert ? <Check /> : <Copy />}
              {kopiert ? 'Kopiert' : 'Text kopieren'}
            </Button>
            <Button variant="ghost" size="sm" onClick={bearbeiten}>
              <Pencil />
              Bearbeiten
            </Button>
            <Button variant="ghost" size="sm" onClick={() => archivieren(!eintrag.archived)}>
              {eintrag.archived ? <ArchiveRestore /> : <Archive />}
              {eintrag.archived ? 'Zurückholen' : 'Archivieren'}
            </Button>

            <span className="text-muted-foreground ml-auto text-xs">
              {eintrag.ausStartbestand ? 'Startbestand' : (eintrag.autor ?? 'Team')} · zuletzt{' '}
              {eintrag.geaendertAm}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
