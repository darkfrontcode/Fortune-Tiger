export interface MapperProtocol<Input, Output> {
  map(input: Input): Output
}
