import type { DefaultSession } from 'next-auth'

/**
 * Die Sitzung traegt bewusst nur die ID. Alles Veraenderliche – Name, Rolle,
 * Team, Profilbild – kommt aus der Datenbank, siehe src/lib/session.ts.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
    } & DefaultSession['user']
  }
}
