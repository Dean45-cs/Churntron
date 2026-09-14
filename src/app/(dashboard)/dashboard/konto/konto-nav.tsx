'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard/konto', label: 'Profil' },
  { href: '/dashboard/konto/anzeige', label: 'Anzeige' },
  { href: '/dashboard/konto/sicherheit', label: 'Sicherheit' },
] as const

export function KontoNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Bereiche des Kontos"
      className="border-border -mx-1 mb-6 flex gap-1 overflow-x-auto border-b pb-px"
    >
      {TABS.map(({ href, label }) => {
        // Das Profil liegt auf dem Stamm-Pfad und darf nicht ueberall mitleuchten.
        const aktiv = href === '/dashboard/konto' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={aktiv ? 'page' : undefined}
            className={cn(
              'rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              aktiv
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
