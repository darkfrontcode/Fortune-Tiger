import type { Money } from '../money/money'
import { LedgerDirection } from './enums'
import { LedgerBalanceGuard, LedgerEquationGuard } from './guards'
import { LedgerType } from './types'

type Schema = LedgerType.Schema
type Input = LedgerType.Input

const balanceGuard = new LedgerBalanceGuard()
const equationGuard = new LedgerEquationGuard()

export class Ledger {
  private constructor(private readonly schema: Schema) {}

  static create(input: Input): Ledger {
    equationGuard.guard(input)

    const schema = {
      id: input.id,
      walletId: input.walletId,
      transactionId: input.transactionId,
      direction: input.direction,
      money: input.money,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      createdAt: input.createdAt,
    }

    return new Ledger(schema)
  }

  static rehydrate(schema: Schema): Ledger {
    return new Ledger(schema)
  }

  get id(): string {
    return this.schema.id
  }

  get walletId(): string {
    return this.schema.walletId
  }

  get transactionId(): string {
    return this.schema.transactionId
  }

  get direction(): LedgerDirection {
    return this.schema.direction
  }

  get money(): Money {
    return this.schema.money
  }

  get balanceBefore(): Money {
    return this.schema.balanceBefore
  }

  get balanceAfter(): Money {
    return this.schema.balanceAfter
  }

  get createdAt(): Date {
    return this.schema.createdAt
  }

  isBalanced(): boolean {
    const movement = this.schema
    const balanced = balanceGuard.guard(movement)

    return balanced
  }
}
