import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-sicherer Teil der Auth-Konfiguration.
 *
 * Die Middleware laeuft im Edge-Runtime und darf deshalb weder Prisma noch
 * bcrypt sehen. Providers und Datenbankzugriff stehen darum in auth.ts,
 * hier nur das, was beide Seiten teilen.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const loggedIn = Boolean(auth?.user)
      const onDashboard = request.nextUrl.pathname.startsWith('/dashboard')
      if (onDashboard) return loggedIn
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.displayName = user.displayName
        token.team = user.team
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.role = token.role
        session.user.displayName = token.displayName
        session.user.team = token.team
      }
      return session
    },
  },
} satisfies NextAuthConfig
