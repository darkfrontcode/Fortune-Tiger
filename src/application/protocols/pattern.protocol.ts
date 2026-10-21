export interface PatternProtocol<Input, Output> {
  test(input: Input): Output
}
