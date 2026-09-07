import type { Role } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    displayName: string
    role: Role
    team: string | null
  }

  interface Session {
    user: {
      id: string
      displayName: string
      role: Role
      team: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    displayName: string
    team: string | null
  }
}

// NextAuth v5 leitet den JWT-Typ aus @auth/core weiter – die Augmentierung muss
// deshalb auch dort greifen, sonst bleibt token.role in den Callbacks `unknown`.
declare module '@auth/core/jwt' {
  interface JWT {
    role: Role
    displayName: string
    team: string | null
  }
}
