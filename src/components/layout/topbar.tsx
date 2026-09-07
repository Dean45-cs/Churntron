import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/lib/utils'
import { isSkeletonDemo } from '@/lib/dev'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Topbar({
  displayName,
  role,
  team,
}: {
  displayName: string
  role: string
  team: string | null
}) {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-6 backdrop-blur">
      {/* Die oeffentliche Demo laeuft mit erfundenen Daten und gebremsten
          Abfragen – das muss man ihr ansehen. */}
      {isSkeletonDemo ? <Badge variant="accentSubtle">Demo · erfundene Daten</Badge> : null}

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />

        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-muted-foreground text-xs">{team ?? 'ohne Team'}</span>
          </div>
          <span className="bg-secondary text-secondary-foreground grid size-9 place-items-center rounded-full text-xs font-semibold">
            {initials(displayName)}
          </span>
        </div>

        {role === 'ADMIN' ? <Badge variant="accentSubtle">Admin</Badge> : null}

        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden" title="Abmelden">
            <LogOut />
          </Button>
        </form>
      </div>
    </header>
  )
}
