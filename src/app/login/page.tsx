import { LoginForm } from './login-form'

export default function LoginPage() {
  // Nur fuer die Demo vorausgefuellt – in einer echten Umgebung entfaellt das.
  const demoPassword = process.env.DEMO_PASSWORD ?? 'churntron'

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="bg-primary text-primary-foreground mx-auto grid size-14 place-items-center rounded-2xl text-xl font-bold">
            C
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Churntron</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Vertriebs-Tool der TNG · Anmeldung</p>
        </div>

        <div className="bg-card border-border rounded-2xl border p-6 shadow-[var(--shadow-soft)]">
          <LoginForm demoPassword={demoPassword} />
        </div>

        <div className="border-border bg-secondary/60 mt-6 rounded-xl border p-4">
          <p className="text-secondary-foreground text-xs font-semibold">Demo-Konten</p>
          <ul className="text-muted-foreground mt-2 space-y-1 font-mono text-xs">
            <li>rep@tng.de · Vertrieb</li>
            <li>admin@tng.de · Ausbilder / Teamleitung</li>
          </ul>
          <p className="text-muted-foreground mt-2 text-xs">
            Passwort für beide: <span className="font-mono">{demoPassword}</span>
          </p>
        </div>
      </div>
    </main>
  )
}
