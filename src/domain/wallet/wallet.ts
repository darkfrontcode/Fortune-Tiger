import type { Money } from '../money/money'
import { WalletCurrencyGuard, WalletFundsGuard, WalletSignGuard } from './guards'
import { WalletType } from './types'

type Schema = WalletType.Schema
type Input = WalletType.Input

const currencyGuard = new WalletCurrencyGuard()
const fundsGuard = new WalletFundsGuard()
const signGuard = new WalletSignGuard()

const revision = {
  open: 1,
  step: 1,
}

export class Wallet {
  private constructor(private readonly schema: Schema) {}

  static open(input: Input): Wallet {
    signGuard.guard(input.balance)

    const schema = {
      id: input.id,
      playerId: input.playerId,
      balance: input.balance,
      version: revision.open,
      createdAt: input.openedAt,
      updatedAt: input.openedAt,
    }

    return new Wallet(schema)
  }

  static rehydrate(schema: Schema): Wallet {
    return new Wallet(schema)
  }

  get id(): string {
    return this.schema.id
  }

  get playerId(): string {
    return this.schema.playerId
  }

  get currency(): string {
    return this.schema.balance.currency
  }

  get balance(): Money {
    return this.schema.balance
  }

  get version(): number {
    return this.schema.version
  }

  get createdAt(): Date {
    return this.schema.createdAt
  }

  get updatedAt(): Date {
    return this.schema.updatedAt
  }

  debit(money: Money, at: Date): void {
    signGuard.guard(money)
    this.assertCurrency(money)

    const balance = this.schema.balance.subtract(money)

    fundsGuard.guard(balance)
    this.write(balance, at)
  }

  credit(money: Money, at: Date): void {
    signGuard.guard(money)
    this.assertCurrency(money)

    const balance = this.schema.balance.add(money)

    this.write(balance, at)
  }

  private assertCurrency(money: Money): void {
    const currency = this.currency
    const compared = money.currency
    const conflictInput = { currency, compared }

    currencyGuard.guard(conflictInput)
  }

  private write(balance: Money, at: Date): void {
    const same = this.schema.balance.equals(balance)

    if (same) { return }

    const version = this.schema.version + revision.step

    this.schema.balance = balance
    this.schema.updatedAt = at
    this.schema.version = version
  }
}
