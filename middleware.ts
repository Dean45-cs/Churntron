import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Nur der edge-sichere Teil der Konfiguration – siehe Kommentar in auth.config.ts.
export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
