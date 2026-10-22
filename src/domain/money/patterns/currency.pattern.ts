

type Input = string
type Output = boolean

export class MoneyCurrencyPattern {
  private readonly expression = /^[A-Z]{3}$/

  test(input: Input): Output {
    return this.expression.test(input)
  }
}
