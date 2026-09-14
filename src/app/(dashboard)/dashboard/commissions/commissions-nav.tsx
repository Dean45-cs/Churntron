'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard/commissions', label: 'Tracker' },
  { href: '/dashboard/commissions/verdienst', label: 'Verdienst' },
  { href: '/dashboard/commissions/rechner', label: 'Brutto / Netto' },
  { href: '/dashboard/commissions/abgleich', label: 'Abgleich' },
  { href: '/dashboard/commissions/katalog', label: 'Katalog' },
] as const

export function CommissionsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Bereiche der Provisionen"
      className="border-border -mx-1 mb-6 flex gap-1 overflow-x-auto border-b pb-px"
    >
      {TABS.map(({ href, label }) => {
        // Der Tracker liegt auf dem Stamm-Pfad und darf nicht ueberall mitleuchten.
        const aktiv =
          href === '/dashboard/commissions' ? pathname === href : pathname.startsWith(href)
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
