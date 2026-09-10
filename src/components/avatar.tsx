import { avatarUrl } from '@/lib/avatar'
import { cn, initials } from '@/lib/utils'

/**
 * Das Profilbild – und wenn keines da ist, die Initialen im Kreis.
 *
 * Bewusst ein einfaches <img> statt next/image: das Bild liegt schon als
 * 256er-Quadrat in der Datenbank und kommt aus der eigenen Route. Durch den
 * Optimierer zu schicken, was bereits die richtige Groesse hat, kostet einen
 * Umweg und bringt nichts.
 *
 * Ohne `alt`-Text: Der Name steht in dieser Anwendung immer daneben, ein
 * zweites Vorlesen waere nur Laerm.
 */

const GROESSEN = {
  sm: { klasse: 'size-8 text-[11px]', px: 32 },
  md: { klasse: 'size-9 text-xs', px: 36 },
  lg: { klasse: 'size-24 text-2xl', px: 96 },
} as const

export type AvatarGroesse = keyof typeof GROESSEN

export function Avatar({
  userId,
  displayName,
  version,
  groesse = 'md',
  className,
}: {
  userId: string
  displayName: string
  version: string | null
  groesse?: AvatarGroesse
  className?: string
}) {
  const { klasse, px } = GROESSEN[groesse]
  const rund = cn('shrink-0 rounded-full', klasse, className)

  if (!version) {
    return (
      <span
        aria-hidden
        className={cn(
          rund,
          'bg-secondary text-secondary-foreground grid place-items-center font-semibold',
        )}
      >
        {initials(displayName)}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- siehe Kommentar oben
    <img
      src={avatarUrl(userId, version)}
      alt=""
      width={px}
      height={px}
      className={cn(rund, 'bg-secondary object-cover')}
    />
  )
}
