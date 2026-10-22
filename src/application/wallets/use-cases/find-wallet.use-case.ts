import { Inject, Injectable } from '@nestjs/common'
import type { Wallet } from '@domain/wallet/wallet'
import type { WalletReaderProtocol } from '@application/protocols'
import { WalletNotFoundError } from '../wallet-not-found.error'
import { WALLET_READER } from '../tokens'

type Input = { walletId: string }
type Output = Promise<Wallet>

@Injectable()
export class FindWalletUseCase {
  constructor(@Inject(WALLET_READER) private readonly walletReader: WalletReaderProtocol) {}

  async execute(input: Input): Output {
    const { walletId } = input
    const wallet = await this.walletReader.findById(walletId)
    const missing = wallet === undefined

    if (missing) { throw new WalletNotFoundError() }

    return wallet
  }
}
