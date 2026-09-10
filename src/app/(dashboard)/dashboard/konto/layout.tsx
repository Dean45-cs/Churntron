import { KontoNav } from './konto-nav'

/**
 * Kopf und Reiter stehen im Layout: beim Wechsel zwischen Profil, Anzeige und
 * Sicherheit bleiben sie stehen, und das loading.tsx des jeweiligen Segments
 * faerbt nur den Inhalt darunter ein.
 */
export default function KontoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mein Konto</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Profil, Anzeige und Passwort. Was hier steht, sehen die Kolleginnen und Kollegen im
          Leaderboard und an deinen Aktivitäten.
        </p>
      </div>
      <KontoNav />
      {children}
    </>
  )
}
