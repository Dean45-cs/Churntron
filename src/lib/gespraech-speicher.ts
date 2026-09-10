/**
 * Der kleine Speicher hinter dem Gespraechsfenster: an welcher Phase man
 * steht, welcher Reiter offen ist, ob die Schublade aufgeklappt ist.
 *
 * Warum ein eigener Store statt useState plus useEffect: aus dem
 * Browser-Speicher zu lesen ist genau der Fall, fuer den React
 * useSyncExternalStore vorsieht – und der Lint-Regelsatz
 * react-hooks/set-state-in-effect verbietet den Umweg ueber einen Effekt
 * ausdruecklich. Nebenbei faellt etwas Nuetzliches ab: zwei Ansichten im
 * selben Dokument – etwa die Schublade und eine zweite Einbettung – bleiben
 * dadurch von selbst gleich.
 *
 * Beides ist bewusst kein Datenbankzustand. Der Leitfaden merkt sich nur die
 * Stelle, an der man steht; er protokolliert nichts.
 */

/** Sitzung = nur dieser Tab, dauerhaft = auch beim naechsten Anmelden. */
type Ablage = 'sitzung' | 'dauerhaft'

const horcher = new Set<() => void>()

function ablage(art: Ablage): Storage | null {
  try {
    return art === 'sitzung' ? sessionStorage : localStorage
  } catch {
    // Privates Fenster, gesperrter Speicher, oder wir laufen auf dem Server.
    return null
  }
}

export function abonniere(melde: () => void) {
  horcher.add(melde)
  return () => {
    horcher.delete(melde)
  }
}

export function lies(art: Ablage, schluessel: string, standard: string): string {
  try {
    return ablage(art)?.getItem(schluessel) ?? standard
  } catch {
    return standard
  }
}

export function schreibe(art: Ablage, schluessel: string, wert: string) {
  try {
    ablage(art)?.setItem(schluessel, wert)
  } catch {
    // Ohne Speicher laeuft alles weiter, nur das Neuladen faengt vorn an.
  }
  for (const melde of horcher) melde()
}

export const SCHLUESSEL = {
  phase: 'churntron-gespraech-phase',
  reiter: 'churntron-gespraech-reiter',
  offen: 'churntron-gespraech-offen',
} as const
