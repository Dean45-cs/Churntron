import { cn } from '@/lib/utils'

/**
 * Formular-Bausteine. Sie halten nur die Klassen zusammen, die sonst in jedem
 * Eingabefeld noch einmal stuenden – bewusst ohne eigenen State, damit sie in
 * Server- und Client-Components gleichermassen laufen.
 */

const FELD =
  'border-input bg-card focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm outline-none focus-visible:ring-2 disabled:opacity-50'

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </label>
  )
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(FELD, className)} {...props} />
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(FELD, 'pr-2', className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(FELD, 'h-auto py-2.5', className)} {...props} />
}
