import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isSkeletonDemo } from '@/lib/dev'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Topbar({
  userId,
  displayName,
  jobTitle,
  role,
  team,
  avatarVersion,
}: {
  userId: string
  displayName: string
  jobTitle: string | null
  role: string
  team: string | null
  avatarVersion: string | null
}) {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-6 backdrop-blur">
      {/* Die oeffentliche Demo laeuft mit erfundenen Daten und gebremsten
          Abfragen – das muss man ihr ansehen. */}
      {isSkeletonDemo ? <Badge variant="accentSubtle">Demo · erfundene Daten</Badge> : null}

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />

        {/* Der Name ist der Weg ins eigene Konto – dort wird er auch geaendert. */}
        <Link
          href="/dashboard/konto"
          className="hover:bg-secondary flex items-center gap-3 rounded-xl px-2 py-1 transition-colors"
          title="Mein Konto"
        >
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-muted-foreground text-xs">{jobTitle ?? team ?? 'ohne Team'}</span>
          </div>
          <Avatar userId={userId} displayName={displayName} version={avatarVersion} />
        </Link>

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
