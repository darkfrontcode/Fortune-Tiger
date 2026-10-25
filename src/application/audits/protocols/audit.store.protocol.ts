import type { AuditOutcome } from '../enums'
import type { AuditType } from '../types'

export interface AuditStoreProtocol {
  record(event: AuditType.Event): Promise<AuditOutcome>
  timeline(query: AuditType.Query): Promise<Array<AuditType.Event>>
}
