import type {
  CancelReason,
  ChallengeMetric,
  CommissionStatus,
  ContractStatus,
  ActivityType,
  ActivityOutcome,
} from '@prisma/client'

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
