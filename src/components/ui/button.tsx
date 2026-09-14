import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Navy traegt die Primaeraktion.
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        // Orange bleibt den echten Highlights vorbehalten.
        accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
        outline: 'border-border bg-card hover:bg-secondary border',
        ghost: 'hover:bg-secondary',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

/**
 * Fuer Links kein asChild/Slot: die Variantenklassen direkt auf <Link/> legen.
 * Das spart eine Client-Grenze und damit eine Quelle fuer Hydration-Fehler.
 * Verwendung: <Link className={buttonVariants({ variant: 'ghost', size: 'sm' })}>


 */
