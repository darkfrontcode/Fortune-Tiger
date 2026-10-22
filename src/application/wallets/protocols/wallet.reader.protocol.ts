import type { Wallet } from '@domain/wallet/wallet'

export interface WalletReaderProtocol {
  findById(id: string): Promise<Wallet | undefined>
}
