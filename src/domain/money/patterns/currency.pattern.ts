import type { PatternProtocol } from '../../../infrastructure/protocols'

type Input = string
type Output = boolean

export class MoneyCurrencyPattern implements PatternProtocol<Input, Output> {
  private readonly expression = /^[A-Z]{3}$/

  test(input: Input): Output {
    return this.expression.test(input)
  }
}
