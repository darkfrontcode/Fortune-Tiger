import type { Ledger } from '@domain/ledger/ledger'

export type LedgerPageInput = {
  walletId: string
  cursor: string | undefined
  limit: number
}

export type LedgerPage = {
  items: Array<Ledger>
  nextCursor: string | undefined
}

export interface LedgerReaderProtocol {
  page(input: LedgerPageInput): Promise<LedgerPage>
}
