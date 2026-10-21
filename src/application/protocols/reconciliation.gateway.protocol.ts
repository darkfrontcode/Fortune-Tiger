import type { ReconciliationsType } from '../reconciliations/types'

type Snapshot = ReconciliationsType.Snapshot

export interface ReconciliationGatewayProtocol {
  load(walletId: string): Promise<Snapshot | undefined>
}
