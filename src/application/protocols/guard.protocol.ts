export interface GuardProtocol<Input, Output> {
  guard(input: Input): Output
}
