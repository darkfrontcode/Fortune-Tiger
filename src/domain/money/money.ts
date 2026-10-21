import Decimal from 'decimal.js'

export interface MoneyProps {
  amount: string
  currency: string
}

type Schema = {
  amount: Decimal
  currency: string
}

const scale = {
  places: 2,
  precision: 40,
}

const ZERO_AMOUNT = '0'

const message = {
  amount: 'Invalid money amount',
  currency: 'Invalid currency',
  conflict: 'Currency mismatch',
}

const pattern = {
  amount: /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
  currency: /^[A-Z]{3}$/,
}

const DecimalMoney = Decimal.clone({
  precision: scale.precision,
  rounding: Decimal.ROUND_HALF_UP,
})

const ZERO = new DecimalMoney(ZERO_AMOUNT)

export class Money {
  private constructor(private readonly schema: Schema) {}

  static from(props: MoneyProps): Money {
    const schema = Money.read(props.amount, props.currency)

    return new Money(schema)
  }

  static zero(currency: string): Money {
    const code = pattern.currency.test(currency)

    if (!code) { throw new Error(message.currency) }

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
    this.assertSameCurrency(other)

    const amount = this.schema.amount.plus(other.schema.amount)

    return this.copy(amount)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)

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
    this.assertSameCurrency(other)

    return this.schema.amount.lessThan(other.schema.amount)
  }

  equals(other: Money): boolean {
    const same = this.currency === other.currency

    if (!same) { return false }

    return this.schema.amount.equals(other.schema.amount)
  }

  toJSON(): MoneyProps {
    const amount = this.amount
    const currency = this.currency

    return { amount, currency }
  }

  private static read(amount: string, currency: string): Schema {
    const accepted = pattern.amount.test(amount)

    if (!accepted) { throw new Error(message.amount) }

    const code = pattern.currency.test(currency)

    if (!code) { throw new Error(message.currency) }

    const decimal = new DecimalMoney(amount)
    const finite = decimal.isFinite()

    if (!finite) { throw new Error(message.amount) }

    const places = decimal.decimalPlaces()
    const over = places > scale.places

    if (over) { throw new Error(message.amount) }

    const negative = decimal.isNegative()

    if (negative) { throw new Error(message.amount) }

    const schema = { amount: decimal, currency }

    return schema
  }

  private assertSameCurrency(other: Money): void {
    const same = this.currency === other.currency

    if (same) { return }

    throw new Error(message.conflict)
  }

  private copy(amount: Decimal): Money {
    const schema = { amount, currency: this.currency }

    return new Money(schema)
  }
}
