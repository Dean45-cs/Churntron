/**
 * Provisionskatalog der TNG Stadtnetz GmbH – Version 1.3, gueltig ab 01.08.2026.
 *
 * Diese Datei ist die Quelle fuer den Seed: `npm run db:seed` schreibt jeden
 * Eintrag per Upsert nach `CommissionRule`. Die Anwendung liest danach nur noch
 * aus der Datenbank – so kann ein Admin einen Satz spaeter aendern, ohne dass
 * jemand das Repo anfasst, und der Katalog bleibt trotzdem versioniert.
 *
 * Der Schluessel (`key`) ist stabil. An ihm haengen die Tracker-Buttons und die
 * bereits gebuchten Positionen; er darf nicht umbenannt werden, auch wenn sich
 * ein Produktname aendert.
 *
 * Betraege stehen in Cent, damit nirgends gerundet werden muss.
 */

export type CommissionCategoryKey =
  'SALE_PRIVATE' | 'SALE_BUSINESS' | 'ADDON' | 'TARIFF_CHANGE' | 'CAMPAIGN'

export type CatalogEntry = {
  key: string
  name: string
  category: CommissionCategoryKey
  amountCents: number
  /** Zusatzbedingung, die den Satz bestimmt – z. B. die Restlaufzeit. */
  variant?: string
  hint?: string
}

/** Gueltig ab – steht im Katalog-PDF als Versionsdatum. */
export const CATALOG_VALID_FROM = new Date('2026-08-01T00:00:00.000Z')
export const CATALOG_VERSION = '1.3'

/**
 * Stornofrist. Der Katalog nennt keine Frist in Tagen, sondern die Bedingung
 * "bei nachtraeglicher Stornierung des Vorgangs entsteht keine Provision".
 * 180 Tage bleiben als Vorbelegung stehen, bis Termin 2 das klaert.
 */
const CLAWBACK_DAYS = 180

export const COMMISSION_CATALOG: readonly CatalogEntry[] = [
  // --- §2 (1) Vertragsabschluss Privat -------------------------------------
  { key: 'fibrelight', name: 'Fibrelight', category: 'SALE_PRIVATE', amountCents: 750 },
  { key: 'fibrefamily', name: 'Fibrefamily', category: 'SALE_PRIVATE', amountCents: 1000 },
  { key: 'fibrepro', name: 'Fibrepro', category: 'SALE_PRIVATE', amountCents: 1500 },
  { key: 'flott50', name: 'Flott50', category: 'SALE_PRIVATE', amountCents: 750 },
  { key: 'flott300', name: 'Flott300', category: 'SALE_PRIVATE', amountCents: 1000 },
  { key: 'flott500', name: 'Flott500', category: 'SALE_PRIVATE', amountCents: 1500 },
  { key: 'surf100', name: 'Surf100', category: 'SALE_PRIVATE', amountCents: 750 },
  { key: 'surf1000', name: 'Surf1.000', category: 'SALE_PRIVATE', amountCents: 1000 },
  { key: 'smart300', name: 'Smart300', category: 'SALE_PRIVATE', amountCents: 750 },
  { key: 'smart1000', name: 'Smart1.000', category: 'SALE_PRIVATE', amountCents: 1000 },
  { key: 'family1000', name: 'Family1.000', category: 'SALE_PRIVATE', amountCents: 1500 },
  { key: 'max1000', name: 'Max.1.000', category: 'SALE_PRIVATE', amountCents: 2000 },
  {
    key: 'winback-privat',
    name: 'Winback',
    category: 'SALE_PRIVATE',
    amountCents: 650,
    variant: 'tarifunabhängig',
  },

  // --- §2 (1) Vertragsabschluss Business -----------------------------------
  { key: 'business-lite1000', name: 'Lite 1000', category: 'SALE_BUSINESS', amountCents: 3000 },
  { key: 'business-basic1000', name: 'Basic 1000', category: 'SALE_BUSINESS', amountCents: 4000 },
  { key: 'business-pro1000', name: 'Pro 1000', category: 'SALE_BUSINESS', amountCents: 5000 },
  {
    key: 'business-premium1000',
    name: 'Premium 1000',
    category: 'SALE_BUSINESS',
    amountCents: 7000,
  },
  {
    key: 'winback-business',
    name: 'Winback',
    category: 'SALE_BUSINESS',
    amountCents: 650,
    variant: 'tarifunabhängig',
  },

  // --- Zusatzprodukte -------------------------------------------------------
  { key: 'waipu-tv', name: 'Waipu TV', category: 'ADDON', amountCents: 1000 },
  {
    key: 'lte-smart-4g',
    name: 'Mobilfunkpaket LTE Smart',
    category: 'ADDON',
    amountCents: 500,
    variant: '4G',
  },
  {
    key: 'lte-komplett-4g',
    name: 'Mobilfunkpaket LTE Komplett',
    category: 'ADDON',
    amountCents: 750,
    variant: '4G',
  },
  {
    key: 'lte-smart-5g',
    name: 'Mobilfunkpaket LTE Smart',
    category: 'ADDON',
    amountCents: 500,
    variant: '5G',
  },
  {
    key: 'lte-komplett-5g',
    name: 'Mobilfunkpaket LTE Komplett',
    category: 'ADDON',
    amountCents: 750,
    variant: '5G',
  },

  // --- Tarifwechsel ---------------------------------------------------------
  // Sechs Faelle aus zwei Zeilen mal drei Spalten. Der erste ist im Katalog mit
  // "-" ausgewiesen: kein Provisionsanspruch. Er steht trotzdem hier, damit die
  // Regel im Tracker sichtbar ist statt zu fehlen – der Button ist gesperrt.
  {
    key: 'tw-sidegrade-rest-gt3',
    name: 'Sidegrade / VVL',
    category: 'TARIFF_CHANGE',
    amountCents: 0,
    variant: 'Restlaufzeit > 3 Monate',
    hint: 'Laut Katalog keine Provision.',
  },
  {
    key: 'tw-sidegrade-rest-lt3',
    name: 'Sidegrade / VVL',
    category: 'TARIFF_CHANGE',
    amountCents: 500,
    variant: 'Restlaufzeit < 3 Monate',
  },
  {
    key: 'tw-sidegrade-ausserhalb',
    name: 'Sidegrade / VVL',
    category: 'TARIFF_CHANGE',
    amountCents: 500,
    variant: 'außerhalb MVLZ',
  },
  {
    key: 'tw-upgrade-rest-gt3',
    name: 'Upgrade',
    category: 'TARIFF_CHANGE',
    amountCents: 500,
    variant: 'Restlaufzeit > 3 Monate',
  },
  {
    key: 'tw-upgrade-rest-lt3',
    name: 'Upgrade',
    category: 'TARIFF_CHANGE',
    amountCents: 750,
    variant: 'Restlaufzeit < 3 Monate',
  },
  {
    key: 'tw-upgrade-ausserhalb',
    name: 'Upgrade',
    category: 'TARIFF_CHANGE',
    amountCents: 750,
    variant: 'außerhalb MVLZ',
  },

  // --- Vertragsnachbearbeitung / Kampagnen ----------------------------------
  { key: 'churn-bau', name: 'Churn Bau', category: 'CAMPAIGN', amountCents: 650 },
  { key: 'churn-kuendigung', name: 'Churn Kündigung', category: 'CAMPAIGN', amountCents: 650 },
  { key: 'churn-widerruf', name: 'Churn Widerruf', category: 'CAMPAIGN', amountCents: 650 },
  {
    key: 'churn-postrueck',
    name: 'Churn Postrückläufer',
    category: 'CAMPAIGN',
    amountCents: 200,
  },
  { key: 'dupecheck', name: 'DupeCheck', category: 'CAMPAIGN', amountCents: 200 },
  { key: 'welcome-calls', name: 'Welcome Calls', category: 'CAMPAIGN', amountCents: 100 },
  {
    key: 'courtesy',
    name: 'Courtesy',
    category: 'CAMPAIGN',
    amountCents: 100,
    variant: 'Allgemein + Vonovia',
  },
] as const

/**
 * Voraussetzungen aus dem Katalog, §2 – bewusst im Wortlaut, weil daran haengt,
 * ob eine Buchung am Monatsende ueberhaupt bezahlt wird.
 */
export const CATALOG_CONDITIONS = [
  'Fallabschliessend bearbeitet und vollständig in den Systemen dokumentiert (Caseris/Jira/CRM/Oiko).',
  'Keine Provision bei unvollständiger Dokumentation, Dubletten, Qualitätsmängeln oder nachträglicher Stornierung.',
  'Abrechnung monatlich auf Basis der dokumentierten Ergebnisse.',
  'Für Vertragsabschlüsse zusätzlich: Anmeldung mit Mitarbeiterkennung im EVE, vollständige Antragsunterlagen, Glasfaser-Neukundenvertrag im Ausbaugebiet, Auftragsbestätigung während des aktiven Arbeitsverhältnisses.',
] as const

export const CATALOG_CLAWBACK_DAYS = CLAWBACK_DAYS

/** Reihenfolge der Buttons: die Datei-Reihenfolge, damit der Katalog lesbar bleibt. */
export function catalogSortOrder(key: string) {
  return COMMISSION_CATALOG.findIndex((e) => e.key === key)
}
