import Decimal from 'decimal.js'
import { MoneyGuard } from './money.guard'
import { MoneyType } from './types'

type Schema = MoneyType.Schema
type Input = MoneyType.Input
type Output = MoneyType.Output

const scale = {
  places: 2,
  precision: 40,
}

const ZERO_AMOUNT = '0'

const DecimalMoney = Decimal.clone({
  precision: scale.precision,
  rounding: Decimal.ROUND_HALF_UP,
})

const ZERO = new DecimalMoney(ZERO_AMOUNT)

export class Money {
  private constructor(private readonly schema: Schema) {}

  static from(input: Input): Money {
    MoneyGuard.amount(input.amount)
    MoneyGuard.currency(input.currency)

    const amount = new DecimalMoney(input.amount)
    const schema = { amount, currency: input.currency }

    return new Money(schema)
  }

  static zero(currency: string): Money {
    MoneyGuard.currency(currency)

    const schema = { amount: ZERO, currency }

    return new Money(schema)
  }

  get amount(): string {
    return this.schema.amount.toFixed(scale.places)
  }

  get currency(): string {
    return this.schema.currency
  }

  add(other: Money): Money {
    MoneyGuard.equal(this.currency, other.currency)

    const amount = this.schema.amount.plus(other.schema.amount)

    return this.copy(amount)
  }

  subtract(other: Money): Money {
    MoneyGuard.equal(this.currency, other.currency)

    const amount = this.schema.amount.minus(other.schema.amount)

    return this.copy(amount)
  }

  negate(): Money {
    const amount = this.schema.amount.negated()

    return this.copy(amount)
  }

  isZero(): boolean {
    return this.schema.amount.isZero()
  }

  isPositive(): boolean {
    return this.schema.amount.greaterThan(ZERO)
  }

  isNegative(): boolean {
    return this.schema.amount.lessThan(ZERO)
  }

  isLessThan(other: Money): boolean {
    MoneyGuard.equal(this.currency, other.currency)

    return this.schema.amount.lessThan(other.schema.amount)
  }

  equals(other: Money): boolean {
    const same = this.currency === other.currency

    if (!same) { return false }

    return this.schema.amount.equals(other.schema.amount)
  }

  toJSON(): Output {
    const amount = this.amount
    const currency = this.currency

    return { amount, currency }
  }

  private copy(amount: Decimal): Money {
    const schema = { amount, currency: this.currency }

    return new Money(schema)
  }
}
