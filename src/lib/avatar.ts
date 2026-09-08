/**
 * Profilbilder: welche Bytes hereinduerfen und unter welcher Adresse sie
 * wieder herauskommen.
 *
 * Verkleinert wird im Browser (siehe bild-waehler.tsx) – das Bild kommt hier
 * schon als 256er-Quadrat an. Das ist bequem, aber kein Schutz: was der Browser
 * schickt, bestimmt der Browser. Deshalb wird hier noch einmal alles geprueft,
 * was zaehlt.
 *
 * Reine Rechnung ohne Datenbank und ohne Node-Module – pruefbar in
 * src/lib/__tests__/avatar.test.ts und in jeder Umgebung ladbar.
 */

/** Kantenlaenge, auf die der Browser zuschneidet. */
export const AVATAR_KANTE = 256

/**
 * Obergrenze fuer die gespeicherten Bytes. Ein 256er-JPEG liegt bei 15–40 KB;
 * 256 KB laesst also reichlich Luft und bleibt weit unter der 1-MB-Schranke,
 * die Next.js fuer Server Actions setzt.
 */
export const AVATAR_MAX_BYTES = 256 * 1024

/**
 * Erlaubt sind genau drei Formate – und ausdruecklich kein SVG: eine
 * SVG-Datei darf Skripte enthalten, und wir liefern das Bild von der eigenen
 * Domain aus. Das waere ein Einfallstor, fuer das es keinen Gegenwert gibt.
 */
export const AVATAR_TYPEN = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AvatarTyp = (typeof AVATAR_TYPEN)[number]

/** Die Dateiendungen fuer den Dateiauswahl-Dialog. */
export const AVATAR_ACCEPT = AVATAR_TYPEN.join(',')

/**
 * Die Bytes tragen einen eigenen ArrayBuffer – ohne den Typparameter waere ein
 * geteilter Puffer mit gemeint, und den nimmt weder Prisma noch die Antwort der
 * Bild-Route entgegen.
 */
export type AvatarBild = { bytes: Uint8Array<ArrayBuffer>; mimeType: AvatarTyp }
export type AvatarPruefung = { ok: true; bild: AvatarBild } | { ok: false; fehler: string }

function beginntMit(bytes: Uint8Array, muster: readonly number[], ab = 0) {
  if (bytes.length < ab + muster.length) return false
  return muster.every((b, i) => bytes[ab + i] === b)
}

/**
 * Das Format aus den Bytes selbst bestimmen.
 *
 * Der angegebene Typ aus der Data-URL wird bewusst ignoriert: er ist eine
 * Behauptung des Absenders, und unter genau diesem Typ wuerden wir die Datei
 * spaeter wieder ausliefern.
 */
export function erkenneBildTyp(bytes: Uint8Array): AvatarTyp | null {
  if (beginntMit(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (beginntMit(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // WebP ist ein RIFF-Container: "RIFF" ... "WEBP"
  if (
    beginntMit(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    beginntMit(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp'
  }
  return null
}

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/

/** Base64 zu Bytes, ohne Node-Modul – so laeuft die Datei ueberall. */
function ausBase64(b64: string): Uint8Array<ArrayBuffer> | null {
  try {
    const roh = atob(b64)
    const bytes = new Uint8Array(roh.length)
    for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/**
 * Die Data-URL aus dem Formular zerlegen und pruefen.
 *
 * Vier Dinge muessen stimmen: die Form der URL, die Groesse, das Format laut
 * Magic Bytes und dass ueberhaupt etwas da ist.
 */
export function liesAvatarDataUrl(roh: string): AvatarPruefung {
  const treffer = DATA_URL.exec(roh.trim())
  if (!treffer) return { ok: false, fehler: 'Das Bild kam in einem unbekannten Format an.' }

  // Base64 traegt 4 Zeichen je 3 Byte – so ist die Groesse bekannt, bevor
  // ueberhaupt dekodiert wird.
  const geschaetzt = Math.floor((treffer[1]!.length * 3) / 4)
  if (geschaetzt > AVATAR_MAX_BYTES) {
    return { ok: false, fehler: 'Das Bild ist zu groß. Bitte ein kleineres wählen.' }
  }

  const bytes = ausBase64(treffer[1]!)
  if (!bytes || bytes.length < 64) return { ok: false, fehler: 'Das Bild ließ sich nicht lesen.' }
  if (bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, fehler: 'Das Bild ist zu groß. Bitte ein kleineres wählen.' }
  }

  const mimeType = erkenneBildTyp(bytes)
  if (!mimeType) {
    return { ok: false, fehler: 'Nur JPEG, PNG und WebP sind als Profilbild möglich.' }
  }

  return { ok: true, bild: { bytes, mimeType } }
}

/**
 * Kennung des aktuellen Bildes. Sie steht in der Bild-Adresse, damit der
 * Browser das Bild dauerhaft behalten darf und trotzdem sofort das neue sieht.
 */
export function neueAvatarVersion(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12)
}

/** Die Adresse, unter der ein Profilbild ausgeliefert wird. */
export function avatarUrl(userId: string, version: string): string {
  return `/api/avatar/${userId}?v=${encodeURIComponent(version)}`
}
