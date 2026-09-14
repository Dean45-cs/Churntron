import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Leitfaden } from '@/components/gespraech/leitfaden'

/**
 * Der Leitfaden als eigenes Fenster – zum Danebenlegen neben das
 * Kampagnen-Lookup, das die Klardaten haelt. Deshalb ohne Sidebar und Topbar:
 * in einem 460 Pixel breiten Fenster ist jede Navigation nur im Weg.
 *
 * Die Route liegt bewusst auf oberster Ebene und nicht unter /dashboard:
 * Layouts schachteln ueber den Pfad, unter /dashboard kaeme die Sidebar
 * zwangslaeufig mit. Den Schutz zieht dafuer auth.config.ts mit, und hier
 * steht zusaetzlich der Gurt zum Hosentraeger.
 *
 * Schriften und den Theme-Skript erbt die Seite von app/layout.tsx – der
 * Dunkelmodus stimmt im zweiten Fenster also von selbst, weil beide Fenster
 * dasselbe localStorage lesen.
 */
export const metadata: Metadata = {
  title: 'Leitfaden – Churntron',
  robots: { index: false, follow: false },
}

export default async function GespraechsFensterPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="h-dvh">
      <Leitfaden imFenster />
    </div>
  )
}
