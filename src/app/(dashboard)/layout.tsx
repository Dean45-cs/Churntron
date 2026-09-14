import { nutzerOderAnmeldung } from '@/lib/session'
import { AutoRefresh } from '@/components/layout/auto-refresh'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { GespraechsPanel } from '@/components/gespraech/gespraechs-panel'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Kommt frisch aus der Datenbank statt aus dem Token: Name und Bild aendern
  // sich, und ein deaktiviertes Konto soll nicht bis zum Ablauf des Tokens
  // weiterarbeiten koennen. Siehe src/lib/session.ts.
  const nutzer = await nutzerOderAnmeldung()

  return (
    <div className="flex min-h-dvh">
      <AutoRefresh sekunden={nutzer.autoRefreshSeconds} />

      <aside className="border-border bg-card hidden w-64 shrink-0 border-r md:block">
        <div className="sticky top-0">
          <Sidebar isAdmin={nutzer.role === 'ADMIN'} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userId={nutzer.id}
          displayName={nutzer.displayName}
          jobTitle={nutzer.jobTitle}
          role={nutzer.role}
          team={nutzer.team}
          avatarVersion={nutzer.avatarVersion}
        />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Haengt im Layout und nicht in einer Seite: so bleibt der Leitfaden
          beim Wechsel zwischen den Modulen offen und an derselben Phase. */}
      <GespraechsPanel />
    </div>
  )
}
