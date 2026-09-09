import type {
  CancelReason,
  ChallengeMetric,
  CommissionCategory,
  CommissionStatus,
  ContractStatus,
  ActivityType,
  ActivityOutcome,
  ObjectionCategory,
  Role,
} from '@prisma/client'

/**
 * Deutsche Beschriftungen der Enum-Werte an einer Stelle.
 * Der Kuendigungsgrund-Katalog ist noch ein Vorschlag – er wird mit dem
 * Ausbilder gegen die echten Listen abgeglichen (siehe PLAN.md).
 */
export const ROLE_LABEL: Record<Role, string> = {
  REP: 'Vertrieb',
  ADMIN: 'Ausbilder / Teamleitung',
}

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  PRICE: 'Preis',
  SERVICE: 'Service',
  MOVE: 'Umzug',
  COMPETITOR: 'Wettbewerber',
  TECHNICAL: 'Technik',
  TERM: 'Vertragsende',
  OTHER: 'Sonstiges',
  UNKNOWN: 'Unbekannt',
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  ACTIVE: 'Aktiv',
  CANCELLED: 'Gekündigt',
  REVOKED: 'Widerrufen',
  WON_BACK: 'Zurückgewonnen',
  LOST: 'Verloren',
}

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING: 'Offen',
  APPROVED: 'Genehmigt',
  PAID: 'Ausgezahlt',
  CLAWBACK: 'Storno',
}

/** Abschnitte des Provisionskatalogs, in der Sprache des Katalogs. */
export const COMMISSION_CATEGORY_LABEL: Record<CommissionCategory, string> = {
  CAMPAIGN: 'Vertragsnachbearbeitung',
  SALE_PRIVATE: 'Vertragsabschluss Privat',
  SALE_BUSINESS: 'Vertragsabschluss Business',
  ADDON: 'Zusatzprodukte',
  TARIFF_CHANGE: 'Tarifwechsel',
}

/** Kurzform fuer Reiter und Balkenbeschriftung. */
export const COMMISSION_CATEGORY_SHORT: Record<CommissionCategory, string> = {
  CAMPAIGN: 'Kampagnen',
  SALE_PRIVATE: 'Privat',
  SALE_BUSINESS: 'Business',
  ADDON: 'Zusatz',
  TARIFF_CHANGE: 'Tarifwechsel',
}

export const CHALLENGE_METRIC_LABEL: Record<ChallengeMetric, string> = {
  CONTRACTS_WON: 'Neuverträge',
  CHURN_SAVED: 'Rückgewinnungen',
  CALLS_DONE: 'Gespräche',
  POINTS: 'Punkte',
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  CALL: 'Anruf',
  EMAIL: 'E-Mail',
  OFFER: 'Angebot',
  NOTE: 'Notiz',
}

/**
 * Themen der Einwand-Wiki. Die Reihenfolge hier ist die Reihenfolge der
 * Schnellfilter ueber der Suche – vorne, was am Telefon am haeufigsten kommt.
 */
export const OBJECTION_CATEGORY_LABEL: Record<ObjectionCategory, string> = {
  PRICE: 'Preis',
  COMPETITOR: 'Wettbewerb',
  NEED: 'Bedarf',
  TIMING: 'Zeitpunkt',
  DECISION: 'Entscheidung',
  CONTRACT: 'Vertrag',
  TECHNICAL: 'Technik',
  CONSTRUCTION: 'Bau',
  SERVICE: 'Service',
  TRUST: 'Vertrauen',
  OTHER: 'Sonstiges',
}

/** Die Kategorien in der Reihenfolge, in der sie oben stehen sollen. */
export const OBJECTION_CATEGORIES = Object.keys(OBJECTION_CATEGORY_LABEL) as ObjectionCategory[]

export const ACTIVITY_OUTCOME_LABEL: Record<ActivityOutcome, string> = {
  REACHED: 'Erreicht',
  NOT_REACHED: 'Nicht erreicht',
  CALLBACK: 'Rückruf',
  WON: 'Gewonnen',
  LOST: 'Verloren',
}
