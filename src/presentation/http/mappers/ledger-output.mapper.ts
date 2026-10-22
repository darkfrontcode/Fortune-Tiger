import type { MapperProtocol } from '@application/protocols'
import type { Ledger } from '@domain/ledger/ledger'
import type { HttpType } from '../types'

type Input = Ledger
type Output = HttpType.LedgerOutput

export class LedgerOutputMapper implements MapperProtocol<Input, Output> {
  map(ledger: Ledger): Output {
    return {
      id: ledger.id,
      transactionId: ledger.transactionId,
      direction: ledger.direction,
      amount: ledger.money.toJSON(),
      balanceBefore: ledger.balanceBefore.toJSON(),
      balanceAfter: ledger.balanceAfter.toJSON(),
      createdAt: ledger.createdAt,
    }
  }
}
