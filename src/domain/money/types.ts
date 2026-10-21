import type Decimal from 'decimal.js'

export namespace MoneyType {
  export type Schema = {
    amount: Decimal
    currency: string
  }

  export type Input = {
    amount: string
    currency: string
  }

  export type Output = {
    amount: string
    currency: string
  }
}
