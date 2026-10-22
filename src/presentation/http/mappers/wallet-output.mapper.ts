import type { MapperProtocol } from '../../../application/protocols'
import type { Wallet } from '../../../domain/wallet/wallet'
import type { HttpType } from '../types'

type Input = Wallet
type Output = HttpType.WalletOutput

export class WalletOutputMapper implements MapperProtocol<Input, Output> {
  map(wallet: Wallet): Output {
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toJSON(),
      version: wallet.version,
    }
  }
}
