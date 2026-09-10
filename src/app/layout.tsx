import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
})

// Mono traegt Kunden-/Vertragsnummern und Kennzahlen – dort zaehlt Ziffernbreite.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Churntron – TNG Vertriebs-Tool',
  description: 'Churn-Leitfaden, Provisionen und Challenges für den TNG-Vertrieb.',
  // Der Link darf weitergegeben werden, in Suchmaschinen gehoert die Seite nicht:
  // sie traegt TNG-Farben und -Namen.
  robots: { index: false, follow: false },
}

/**
 * Setzt das Theme, bevor React uebernimmt – sonst blitzt beim Laden im
 * Dunkelmodus kurz die helle Seite auf.
 */
const themeScript = `
try {
  var stored = localStorage.getItem('churntron-theme');
  var dark = stored ? stored === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${archivo.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  )
}
