import type { CommissionStatus, ContractStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { COMMISSION_STATUS_LABEL, CONTRACT_STATUS_LABEL } from '@/lib/labels'

const CONTRACT_VARIANT = {
  ACTIVE: 'default',
  CANCELLED: 'destructive',
  REVOKED: 'destructive',
  WON_BACK: 'success',
  LOST: 'outline',
} as const

const COMMISSION_VARIANT = {
  PENDING: 'outline',
  APPROVED: 'primary',
  PAID: 'success',
  CLAWBACK: 'destructive',
} as const

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={CONTRACT_VARIANT[status]}>{CONTRACT_STATUS_LABEL[status]}</Badge>
}

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return <Badge variant={COMMISSION_VARIANT[status]}>{COMMISSION_STATUS_LABEL[status]}</Badge>
}
