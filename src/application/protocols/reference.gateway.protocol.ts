import type { ReferenceType } from '../references/types'

type RetryOutput = ReferenceType.RetryOutput

export interface ReferenceGatewayProtocol {
  retry(transactionId: string, at: Date): Promise<RetryOutput | undefined>
}
