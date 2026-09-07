import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  // Die Middleware faengt das schon ab – hier nur der Gurt zum Hosentraeger,
  // damit die Seiten sich auf session.user verlassen koennen.
  if (!session?.user) redirect('/login')

  const { displayName, role, team } = session.user

  return (
    <div className="flex min-h-dvh">
      <aside className="border-border bg-card hidden w-64 shrink-0 border-r md:block">
        <div className="sticky top-0">
          <Sidebar isAdmin={role === 'ADMIN'} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar displayName={displayName} role={role} team={team} />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
