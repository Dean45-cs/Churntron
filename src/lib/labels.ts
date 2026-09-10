import type {
  CancelReason,
  ChallengeMetric,
  CommissionCategory,
  CommissionStatus,
  ContractStatus,
  ActivityType,
  ActivityOutcome,
  DuelMetric,
  DuelMode,
} from '@prisma/client'
import type { DuellPhase } from '@/lib/duels'

/**
 * Deutsche Beschriftungen der Enum-Werte an einer Stelle.
 * Der Kuendigungsgrund-Katalog ist noch ein Vorschlag – er wird mit dem
 * Ausbilder gegen die echten Listen abgeglichen (siehe PLAN.md).
 */
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

export const ACTIVITY_OUTCOME_LABEL: Record<ActivityOutcome, string> = {
  REACHED: 'Erreicht',
  NOT_REACHED: 'Nicht erreicht',
  CALLBACK: 'Rückruf',
  WON: 'Gewonnen',
  LOST: 'Verloren',
}

export const DUEL_MODE_LABEL: Record<DuelMode, string> = {
  ONE_VS_ONE: '1 gegen 1',
  TWO_VS_TWO: '2 gegen 2',
}

/** Worum im Duell gespielt wird. Die Frage dazu steht in src/lib/duels.ts. */
export const DUEL_METRIC_LABEL: Record<DuelMetric, string> = {
  COMMISSION_CENTS: 'Provision',
  BOOKINGS: 'Gebuchte Vorgänge',
  SALES: 'Abschlüsse',
  CHURN_SAVED: 'Rückgewinnungen',
  CALLS: 'Gespräche',
  POINTS: 'Punkte',
}

export const DUEL_PHASE_LABEL: Record<DuellPhase, string> = {
  EINLADUNG: 'Einladung offen',
  LAEUFT: 'läuft',
  BEENDET: 'beendet',
  ABGELEHNT: 'abgelehnt',
  ABGESAGT: 'abgesagt',
  VERFALLEN: 'verfallen',
}
