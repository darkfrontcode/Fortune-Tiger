import { Inject, Injectable } from '@nestjs/common'
import type { LedgerPage, LedgerReaderProtocol, WalletReaderProtocol } from '@application/protocols'
import { LEDGER_READER, WALLET_READER } from '../tokens'
import { WalletNotFoundError } from '../wallet-not-found.error'

type Input = {
  walletId: string
  cursor: string | undefined
  limit: number
}

type Output = Promise<LedgerPage>

@Injectable()
export class ListWalletLedgerUseCase {
  constructor(
    @Inject(WALLET_READER) private readonly walletReader: WalletReaderProtocol,
    @Inject(LEDGER_READER) private readonly ledgerReader: LedgerReaderProtocol,
  ) {}

  async execute(input: Input): Output {
    const { walletId, cursor, limit } = input
    const wallet = await this.walletReader.findById(walletId)
    const missing = wallet === undefined

    if (missing) { throw new WalletNotFoundError() }

    const pageInput = { walletId, cursor, limit }

    return this.ledgerReader.page(pageInput)
  }
}
