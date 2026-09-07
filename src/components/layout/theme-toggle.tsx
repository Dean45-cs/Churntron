'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Bewusst ohne React-State: welches Theme aktiv ist, steht als Klasse am
 * <html>-Element (gesetzt vom Inline-Skript in layout.tsx, bevor React laeuft).
 * Beide Icons werden gerendert, CSS blendet das passende ein – damit gibt es
 * weder einen Hydration-Unterschied noch einen Effekt, der nach dem ersten
 * Rendern nochmal alles anfasst.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('churntron-theme', next ? 'dark' : 'light')
    } catch {
      // localStorage kann blockiert sein – dann gilt die Auswahl nur fuer diese Sitzung.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Zwischen hellem und dunklem Design wechseln"
      title="Design wechseln"
    >
      <Moon className="block dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  )
}
