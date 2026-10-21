import type { Money } from '../money/money'
import { LedgerGuard } from './ledger.guard'
import { LedgerDirection, LedgerType } from './types'

type Schema = LedgerType.Schema
type Input = LedgerType.Input

export class Ledger {
  private constructor(private readonly schema: Schema) {}

  static create(input: Input): Ledger {
    LedgerGuard.equation(
      input.direction,
      input.balanceBefore,
      input.money,
      input.balanceAfter,
    )

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
    const balanced = LedgerGuard.balanced(
      this.schema.direction,
      this.schema.balanceBefore,
      this.schema.money,
      this.schema.balanceAfter,
    )

    return balanced
  }
}
