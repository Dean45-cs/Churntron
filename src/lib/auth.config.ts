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
  /**
   * Ohne das wirft NextAuth hinter jedem Proxy `UntrustedHost` und der Login
   * laeuft ins Leere – lokal im Produktionsmodus genauso wie beim Hosting.
   *
   * Vertretbar, weil wir ausschliesslich Credentials verwenden: es gibt keinen
   * OAuth-Rueckruf, dessen Ziel ueber einen gefaelschten Host-Header umgebogen
   * werden koennte. Sobald ein echter Anbieter dazukommt (etwa Entra ID, siehe
   * PLAN.md), gehoert das hier auf den Pruefstand und AUTH_URL fest gesetzt.
   */
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const loggedIn = Boolean(auth?.user)
      const { pathname } = request.nextUrl
      // /gespraech ist das eigene Fenster des Leitfadens. Es liegt ausserhalb
      // von /dashboard, weil es ohne Sidebar und Topbar laufen muss – der
      // Schutz muss deshalb ausdruecklich mitgezogen werden.
      const geschuetzt = pathname.startsWith('/dashboard') || pathname.startsWith('/gespraech')
      if (geschuetzt) return loggedIn
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
