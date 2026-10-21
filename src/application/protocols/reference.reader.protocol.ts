export interface ReferenceReaderProtocol {
  due(at: Date, limit: number): Promise<Array<string>>
}
