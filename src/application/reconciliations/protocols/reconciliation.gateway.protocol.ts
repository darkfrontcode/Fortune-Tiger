import type { ReconciliationsType } from '../types'

type Snapshot = ReconciliationsType.Snapshot

export interface ReconciliationGatewayProtocol {
  load(walletId: string): Promise<Snapshot | undefined>
}
