import { cn } from '@/lib/utils'

/**
 * Basis-Baustein fuer alle Ladezustaende.
 *
 * Regel im Projekt: Ein Skeleton bildet die FORM des echten Inhalts nach –
 * gleiche Hoehe, gleiche Breite, gleiche Abstaende. Sonst springt das Layout,
 * sobald die Daten da sind. Deshalb gibt es unter src/components/skeletons/
 * fuer jeden wiederkehrenden Block einen passenden Baustein statt eines
 * generischen grauen Kastens.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} {...props} />
}
