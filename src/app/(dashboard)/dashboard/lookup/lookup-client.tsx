'use client'

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Upload, Download, FileSpreadsheet, Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { buildReportingZeilen, reportingDateiname, zeilenAlsCsv } from '@/lib/lookup/export'
import { findeDubletten, partnerBezeichnung } from '@/lib/lookup/dubletten'
import { berechneFortschritt, formatiereAnwahl } from '@/lib/lookup/fortschritt'
import { recKey } from '@/lib/lookup/parser'
import { passt, suchText } from '@/lib/lookup/suche'
import { abonniereMinute, jetztMinute, serverMinute } from '@/lib/lookup/uhr'
import {
  abonniereStand,
  aendereStand,
  aktuellerStand,
  serverStand,
  type Schichtstand,
} from '@/lib/lookup/storage'
import type { FormularStand, KampagnenTyp, LookupRecord, StatusWert } from '@/lib/lookup/types'
import { leseDatei, schreibeOffeneDatei, type DateiMeta } from '@/lib/lookup/xlsx'
import { cn } from '@/lib/utils'
import { FortschrittKarte } from './fortschritt-karte'
import { KampagnenFormular } from './kampagnen-formular'
import { LookupKarte } from './lookup-karte'

/**
 * Das Kampagnen-Lookup in Churntron.
 *
 * ALLES HIER LAEUFT IM BROWSER. Die Liste von PP wird lokal gelesen, lokal
 * durchsucht und lokal wieder ausgegeben. Es gibt in dieser Datei – und im
 * ganzen Ordner – keinen fetch, keine Server Action und keinen Prisma-Aufruf.
 * Das ist die Bedingung dafuer, dass das Tool ueberhaupt hier stehen darf:
 * die Liste traegt Klardaten, die Datenbank darf sie nicht sehen
 * (AGENTS.md, "Die eine Regel, die nicht verhandelbar ist").
 *
 * Ohne diese Trennung waere aus einem Umzug ein Datenschutzvorfall geworden.
 */

/** Mehr als das rendert kein Mensch durch – ohne Suche wird abgeschnitten. */
const CAP = 300

function kampagneAusName(n: string): KampagnenTyp {
  const s = (n || '').toLowerCase()
  if (/welcome/.test(s)) return 'welcome'
  if (/courtesy|curtesy|kurtesy/.test(s)) return 'courtesy'
  return 'none'
}

export function LookupClient() {
  const [records, setRecords] = useState<LookupRecord[]>([])
  const [metaMap, setMetaMap] = useState<Record<string, DateiMeta>>({})
  const [dateien, setDateien] = useState<string[]>([])
  const [suche, setSuche] = useState('')
  const [camp, setCamp] = useState<KampagnenTyp>('none')
  // Der Schichtstand liegt im localStorage – einem Speicher, der React nicht
  // gehoert. Deshalb haengt er hier dran, statt beim Mounten nachgeladen zu
  // werden; die Begruendung steht in storage.ts.
  const stand: Schichtstand = useSyncExternalStore(abonniereStand, aktuellerStand, serverStand)
  const [hideDone, setHideDone] = useState(false)
  const [offenKeys, setOffenKeys] = useState<Set<string>>(new Set())
  const [formKey, setFormKey] = useState<string | null>(null)
  const [meldung, setMeldung] = useState('')
  const [busy, setBusy] = useState(false)
  const [ueberDrop, setUeberDrop] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zuletztKopiert = useRef('')

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const zeigeMeldung = useCallback((text: string) => {
    setMeldung(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setMeldung(''), 1800)
  }, [])

  const kopiere = useCallback(
    (text: string) => {
      if (!text) return
      const fertig = () =>
        zeigeMeldung('kopiert  ' + (text.length > 40 ? text.slice(0, 39) + '…' : text))
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(fertig, () => zeigeMeldung('Kopieren nicht möglich'))
      } else {
        // http-Kontext im internen Netz: der alte Weg funktioniert dort noch.
        const feld = document.createElement('textarea')
        feld.value = text
        feld.style.position = 'fixed'
        feld.style.opacity = '0'
        document.body.appendChild(feld)
        feld.select()
        try {
          document.execCommand('copy')
          fertig()
        } catch {
          zeigeMeldung('Kopieren nicht möglich')
        }
        document.body.removeChild(feld)
      }
    },
    [zeigeMeldung],
  )

  const setzeStatus = useCallback(
    (r: LookupRecord, st: Exclude<StatusWert, ''>) => {
      const key = recKey(r)
      const jetzt = Date.now()
      const hatFormular = camp === 'welcome' || camp === 'courtesy'

      aendereStand((alt) => {
        const statusMap = { ...alt.statusMap }
        if (st === 'done' && hatFormular) {
          statusMap[key] = 'done'
        } else if (statusMap[key] === st) {
          delete statusMap[key]
        } else {
          statusMap[key] = st
        }
        return {
          ...alt,
          statusMap,
          tsMap: { ...alt.tsMap, [key]: jetzt },
          kontaktMap: { ...alt.kontaktMap, [key]: jetzt },
        }
      })

      if (st === 'done' && hatFormular) setFormKey(key)
    },
    [camp],
  )

  const setzeNotiz = useCallback((r: LookupRecord, wert: string) => {
    const key = recKey(r)
    const jetzt = Date.now()
    aendereStand((alt) => {
      const notizMap = { ...alt.notizMap }
      const kontaktMap = { ...alt.kontaktMap }
      if (wert.trim()) {
        notizMap[key] = wert
        // Eine Notiz entsteht beim Anruf – auch dann, wenn niemand abgenommen
        // hat. Genau das ist der Zeitpunkt, der auf der Karte stehen soll.
        kontaktMap[key] = jetzt
      } else {
        delete notizMap[key]
        // Notiz geloescht und kein Haken gesetzt: dann war da auch nichts.
        if (!alt.statusMap[key]) delete kontaktMap[key]
      }
      return { ...alt, notizMap, kontaktMap }
    })
  }, [])

  const setzeFormular = useCallback(
    (key: string, feld: keyof FormularStand, wert: boolean | number) => {
      const jetzt = Date.now()
      aendereStand((alt) => {
        const f: FormularStand = { ...(alt.formMap[key] ?? {}) }
        if (feld === 'bewertung') {
          if (f.bewertung === wert) delete f.bewertung
          else f.bewertung = wert as number
        } else if (wert) {
          f[feld] = true
        } else {
          delete f[feld]
        }
        const formMap = { ...alt.formMap }
        if (Object.keys(f).length) formMap[key] = f
        else delete formMap[key]
        return {
          ...alt,
          formMap,
          tsMap: { ...alt.tsMap, [key]: jetzt },
          kontaktMap: { ...alt.kontaktMap, [key]: jetzt },
        }
      })
    },
    [],
  )

  /* ---------------- Dateien einlesen ---------------- */

  const nimmDateien = useCallback(
    async (liste: FileList | File[]) => {
      const arr = [...liste].filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name))
      if (!arr.length) return
      setBusy(true)
      const neueRecords: LookupRecord[] = []
      const neueMeta: Record<string, DateiMeta> = {}
      const neueNamen: string[] = []
      for (const f of arr) {
        try {
          const { records: recs, meta } = await leseDatei(f)
          neueRecords.push(...recs)
          neueMeta[f.name] = meta
          neueNamen.push(f.name)
        } catch (e) {
          const grund = e instanceof Error ? e.message : String(e)
          zeigeMeldung(`Konnte ${f.name} nicht lesen: ${grund}`)
        }
      }
      setBusy(false)
      if (!neueNamen.length) return

      setRecords((alt) => [...alt, ...neueRecords])
      setMetaMap((alt) => ({ ...alt, ...neueMeta }))
      setDateien((alt) => [...alt, ...neueNamen])
      // Die Kampagne steht meist im Dateinamen – einmal erkannt reicht.
      // Eine bereits getroffene Auswahl wird nicht ueberschrieben.
      const erkannt = kampagneAusName(neueNamen[0] ?? '')
      if (erkannt !== 'none') setCamp((c) => (c === 'none' ? erkannt : c))
    },
    [zeigeMeldung],
  )

  const zuruecksetzen = useCallback(() => {
    setRecords([])
    setMetaMap({})
    setDateien([])
    setSuche('')
    setOffenKeys(new Set())
    setFormKey(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  /* ---------------- Suche und Liste ---------------- */

  // Der Suchtext haengt nur an den Datensaetzen; die Notiz kommt beim Filtern
  // dazu, damit ein Tastendruck im Notizfeld nicht die ganze Liste neu indiziert.
  const hayBasis = useMemo(() => records.map((r) => suchText(r)), [records])
  const keys = useMemo(() => records.map((r) => recKey(r)), [records])
  const verzoegerteSuche = useDeferredValue(suche)

  // Gefiltert wird ueber INDIZES, nicht ueber Datensaetze: die Dubletten-Map
  // ist nach Index adressiert, und so bleibt der Bezug ohne eine zweite
  // Zuordnungstabelle erhalten.
  const gefiltert = useMemo(() => {
    const q = verzoegerteSuche.trim().toLowerCase()
    const out: number[] = []
    for (let i = 0; i < records.length; i++) {
      const key = keys[i]!
      if (hideDone && stand.statusMap[key] === 'done') continue
      const notiz = stand.notizMap[key]
      const hay = notiz ? hayBasis[i] + '  ' + notiz.toLowerCase() : hayBasis[i]!
      if (!passt(hay, q)) continue
      out.push(i)
    }
    return out
  }, [records, keys, hayBasis, verzoegerteSuche, hideDone, stand.statusMap, stand.notizMap])

  const abgeschnitten = !verzoegerteSuche.trim() && gefiltert.length > CAP
  const sichtbar = abgeschnitten ? gefiltert.slice(0, CAP) : gefiltert

  // Ein Treffer bei aktiver Suche: Nummer gleich in die Zwischenablage.
  // Genau dafuer ist das Feld da – Nummer tippen, einfuegen, anrufen.
  const einTreffer =
    suche.trim() && gefiltert.length === 1 ? (records[gefiltert[0]!] ?? null) : null
  useEffect(() => {
    if (!einTreffer?.dial) return
    const marke = recKey(einTreffer) + '|' + einTreffer.dial
    if (zuletztKopiert.current === marke) return
    zuletztKopiert.current = marke
    setOffenKeys((alt) => new Set(alt).add(recKey(einTreffer)))
    kopiere(einTreffer.dial)
  }, [einTreffer, kopiere])

  // Die laufende Minute kommt aus einem externen Speicher, nicht aus dem
  // Render-Pfad – Begruendung in uhr.ts.
  const jetzt = useSyncExternalStore(abonniereMinute, jetztMinute, serverMinute)

  const fortschritt = useMemo(() => berechneFortschritt(keys, stand, jetzt), [keys, stand, jetzt])

  // Ueber ALLE Datensaetze, nicht nur die sichtbaren: der Zwilling einer Zeile
  // steht gern hinter dem Schnitt bei 300 oder ausserhalb der Suche.
  const dubletten = useMemo(() => findeDubletten(records), [records])

  /* ---------------- Exporte ---------------- */

  const exportiereCsv = useCallback(() => {
    const zeilen = buildReportingZeilen(records, {
      camp,
      statusMap: stand.statusMap,
      formMap: stand.formMap,
      tsMap: stand.tsMap,
    })
    if (zeilen.length <= 1) {
      zeigeMeldung('Keine ausgefüllten Formulare/Markierungen')
      return
    }
    const blob = new Blob([zeilenAlsCsv(zeilen)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = reportingDateiname(camp, new Date())
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
    zeigeMeldung(`${zeilen.length - 1} Zeilen als CSV exportiert`)
  }, [records, camp, stand, zeigeMeldung])

  const exportiereOffene = useCallback(async () => {
    const namen = [...new Set(records.map((r) => r._file))].filter(Boolean) as string[]
    if (!namen.length) return
    let entfernt = 0
    let offen = 0
    let geschrieben = 0
    for (const fn of namen) {
      const meta = metaMap[fn]
      if (!meta) continue
      const behalten = new Set<number>()
      for (const r of records) {
        if (r._file !== fn) continue
        if (stand.statusMap[recKey(r)] === 'done') entfernt++
        else {
          behalten.add(r._aoaIdx)
          offen++
        }
      }
      await schreibeOffeneDatei(fn, meta, behalten)
      geschrieben++
    }
    zeigeMeldung(
      `${entfernt} erledigt entfernt · ${offen} offen exportiert` +
        (geschrieben > 1 ? ` (${geschrieben} Dateien)` : ''),
    )
  }, [records, metaMap, stand.statusMap, zeigeMeldung])

  const markierungenLoeschen = useCallback(() => {
    if (!window.confirm('Alle Erledigt/Prüfen-Markierungen löschen?')) return
    aendereStand((alt) => ({ ...alt, statusMap: {} }))
  }, [])

  /* ---------------- Darstellung ---------------- */

  const formRecord = formKey ? records.find((r) => recKey(r) === formKey) : undefined
  const geladen = records.length > 0

  if (!geladen) {
    return (
      <>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            if (e.target.files) void nimmDateien(e.target.files)
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault()
            setUeberDrop(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setUeberDrop(false)}
          onDrop={(e) => {
            e.preventDefault()
            setUeberDrop(false)
            void nimmDateien(e.dataTransfer.files)
          }}
          disabled={busy}
          className={cn(
            'bg-card w-full rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
            ueberDrop ? 'border-primary bg-secondary' : 'border-border hover:border-primary',
            busy && 'pointer-events-none opacity-60',
          )}
        >
          <Upload className="text-primary mx-auto size-8" />
          <p className="mt-3 text-base font-semibold">
            {busy ? 'Liste wird gelesen …' : 'Excel-Liste hierher ziehen'}
          </p>
          <p className="text-muted-foreground mt-1.5 text-sm">
            oder klicken · .xlsx .xls .csv · mehrere möglich
          </p>
          <p className="text-muted-foreground mt-5 text-xs">
            Läuft komplett im Browser – die Liste wird nicht hochgeladen und nicht gespeichert.
          </p>
        </button>
        <Meldung text={meldung} />
      </>
    )
  }

  return (
    <>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
          <Input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSuche('')
            }}
            inputMode="search"
            autoComplete="off"
            placeholder="Kundennummer, Name, Nummer …"
            aria-label="Suche"
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>
        <Button variant="outline" onClick={zuruecksetzen} className="h-12" title="Liste verwerfen">
          <RotateCcw />
          Andere Liste
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Kampagne</span>
            <Select
              value={camp}
              onChange={(e) => setCamp(e.target.value as KampagnenTyp)}
              className="h-9 w-auto text-sm"
              aria-label="Kampagne"
            >
              <option value="none">Kein Formular</option>
              <option value="welcome">Welcome Call</option>
              <option value="courtesy">Courtesy Call</option>
            </Select>
          </label>
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
              className="accent-primary size-4"
            />
            Erledigte ausblenden
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportiereCsv}
            title="Reporting-CSV der ausgefüllten Formulare – Struktur wie im alten Tool"
          >
            <Download />
            Reporting (CSV)
          </Button>
          <Button
            size="sm"
            onClick={() => void exportiereOffene()}
            title="Erledigte entfernen und Restliste im Originalformat speichern"
          >
            <FileSpreadsheet />
            Offene (xlsx)
          </Button>
        </div>
      </div>

      {/* Der Stand der Schicht gehoert ueber die Liste, nicht in die Fusszeile:
          er beantwortet die Frage, bevor man sie stellt. Die Meta-Zeile
          darunter bleibt bei dem, was die Suche gerade zeigt. */}
      <FortschrittKarte fortschritt={fortschritt} dubletten={dubletten.size} />

      <div className="text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <span>
          <b className="text-foreground tabular">{gefiltert.length.toLocaleString('de-DE')}</b>{' '}
          Treffer
          {abgeschnitten ? ` (erste ${CAP})` : ''}
          {fortschritt.erledigt + fortschritt.zuPruefen > 0 ? (
            <>
              {' · '}
              <button
                type="button"
                onClick={markierungenLoeschen}
                className="text-primary hover:underline"
              >
                Markierungen löschen
              </button>
            </>
          ) : null}
        </span>
        <span className="truncate">{dateien.join(', ')}</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {sichtbar.length ? (
          sichtbar.map((i) => {
            const r = records[i]!
            const key = recKey(r)
            const dublette = dubletten.get(i)
            const kontakt = stand.kontaktMap[key]
            return (
              <LookupKarte
                key={key + '|' + r._aoaIdx + '|' + r._file}
                record={r}
                status={stand.statusMap[key] ?? ''}
                notiz={stand.notizMap[key] ?? ''}
                angewaehlt={kontakt ? formatiereAnwahl(kontakt, jetzt) : undefined}
                offen={offenKeys.has(key)}
                dublette={dublette}
                partner={dublette?.partner.map((p) => partnerBezeichnung(records[p]!))}
                onToggleOffen={() =>
                  setOffenKeys((alt) => {
                    const neu = new Set(alt)
                    if (neu.has(key)) neu.delete(key)
                    else neu.add(key)
                    return neu
                  })
                }
                onStatus={(st) => setzeStatus(r, st)}
                onNotiz={(wert) => setzeNotiz(r, wert)}
                onCopy={kopiere}
                onSpringeZu={setSuche}
              />
            )
          })
        ) : (
          <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
            Keine Treffer.
          </div>
        )}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
        Nummer wird beim Klick kopiert → in myApps <Kbd>Strg</Kbd>+<Kbd>V</Kbd>, grün drücken.
        <br />
        Format: <b>+49&nbsp;1512&nbsp;3456789</b> → <b>0015123456789</b>
      </p>

      {formRecord && formKey && camp !== 'none' ? (
        <KampagnenFormular
          record={formRecord}
          camp={camp}
          stand={stand.formMap[formKey] ?? {}}
          onSet={(feld, wert) => setzeFormular(formKey, feld, wert)}
          onClose={() => setFormKey(null)}
          onUndone={() => {
            aendereStand((alt) => {
              const statusMap = { ...alt.statusMap }
              delete statusMap[formKey]
              return { ...alt, statusMap }
            })
            setFormKey(null)
          }}
        />
      ) : null}

      <Meldung text={meldung} />
    </>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-card border-border mx-0.5 rounded border px-1.5 py-0.5 font-sans text-[11px]">
      {children}
    </kbd>
  )
}

/** Kurze Rueckmeldung unten – im Stehen am Telefon die einzige, die ankommt. */
function Meldung({ text }: { text: string }) {
  if (!text) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
    >
      <Badge variant="primary" className="px-4 py-2 text-sm shadow-[var(--shadow-soft)]">
        {text}
      </Badge>
    </div>
  )
}
