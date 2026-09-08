'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PhoneOff,
  Wallet,
  Trophy,
  Upload,
  Users,
  UserCog,
  MessagesSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const NAV = [
  { href: '/dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { href: '/dashboard/churn', label: 'Churn-Leitfaden', icon: PhoneOff },
  { href: '/dashboard/wiki', label: 'Einwand-Wiki', icon: MessagesSquare },
  { href: '/dashboard/commissions', label: 'Provisionen', icon: Wallet },
  { href: '/dashboard/challenges', label: 'Challenges', icon: Trophy },
] as const

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Hauptnavigation" className="flex h-full flex-col gap-1 p-4">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2 py-1">
        <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl text-sm font-bold">
          C
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Churntron</span>
          <span className="text-muted-foreground text-xs">TNG Vertrieb</span>
        </span>
      </Link>

      {NAV.map(({ href, label, icon: Icon }) => {
        // /dashboard darf nicht bei jeder Unterseite mitleuchten.
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        )
      })}

      {isAdmin ? (
        <div className="mt-6 border-t pt-4">
          <p className="text-muted-foreground px-3 pb-2 text-xs font-semibold tracking-wide uppercase">
            Verwaltung
          </p>

          <Link
            href="/dashboard/verwaltung/nutzer"
            aria-current={pathname.startsWith('/dashboard/verwaltung/nutzer') ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/dashboard/verwaltung/nutzer')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Users className="size-4 shrink-0" />
            Nutzer
          </Link>

          {/* Noch ohne Funktion – kommt in Stage 2. Bewusst sichtbar, damit die
              Rollensteuerung im Geruest schon zu sehen ist. */}
          <span className="text-muted-foreground/70 flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium">
            <Upload className="size-4 shrink-0" />
            Datenimport
            <Badge variant="outline" className="ml-auto">
              folgt
            </Badge>
          </span>
        </div>
      ) : null}

      <Link
        href="/dashboard/konto"
        aria-current={pathname.startsWith('/dashboard/konto') ? 'page' : undefined}
        className={cn(
          'mt-6 flex items-center gap-3 rounded-xl border-t px-3 py-2.5 pt-4 text-sm font-medium transition-colors',
          pathname.startsWith('/dashboard/konto')
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <UserCog className="size-4 shrink-0" />
        Mein Konto
      </Link>
    </nav>
  )
}
