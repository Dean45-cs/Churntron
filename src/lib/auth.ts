import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { authConfig } from '@/lib/auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(credentials?.password ?? '')
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        // Deaktivierte Konten kommen gar nicht erst herein. Bewusst mit
        // derselben Meldung wie ein falsches Passwort – wer probiert, soll
        // nicht erfahren, welche Adressen es gibt.
        if (!user.active) return null

        // Nur der Zeitpunkt, kein Verlauf. Er hilft Admins, tote Konten zu
        // finden, und sonst niemandem bei sonst nichts.
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        // Mehr als die ID braucht das Token nicht – siehe auth.config.ts.
        return { id: user.id, email: user.email, name: user.displayName }
      },
    }),
  ],
})
