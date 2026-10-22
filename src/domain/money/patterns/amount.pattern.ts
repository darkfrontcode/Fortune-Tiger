

type Input = string
type Output = boolean

export class MoneyAmountPattern {
  private readonly expression = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/

  test(input: Input): Output {
    return this.expression.test(input)
  }
}
