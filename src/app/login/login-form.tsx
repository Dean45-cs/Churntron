'use client'

import { useActionState } from 'react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { login, type LoginState } from './actions'

export function LoginForm({ demoPassword }: { demoPassword: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-Mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="rep@tng.de"
          className="border-input bg-card focus-visible:ring-ring h-11 rounded-xl border px-3.5 text-sm outline-none focus-visible:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Passwort</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          defaultValue={demoPassword}
          className="border-input bg-card focus-visible:ring-ring h-11 rounded-xl border px-3.5 text-sm outline-none focus-visible:ring-2"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1 h-11">
        <LogIn />
        {pending ? 'Wird angemeldet …' : 'Anmelden'}
      </Button>
    </form>
  )
}
