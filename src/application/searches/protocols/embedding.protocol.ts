export interface EmbeddingProtocol {
  embed(text: string): Promise<Array<number>>
}
