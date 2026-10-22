import type { WagerTransaction } from '../../domain/wager/wager'

export interface WagerReaderProtocol {
  findById(id: string): Promise<WagerTransaction | undefined>
  findByProviderAndExternal(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | undefined>
}
