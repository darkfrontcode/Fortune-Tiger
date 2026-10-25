import { Injectable } from '@nestjs/common'
import type { EmbeddingProtocol } from '@application/searches'

const mediaType = 'application/json'
const path = 'api/embed'

type Reply = {
  embeddings?: Array<Array<number>>
}

const failure = (message: string): Error => {
  return new Error(message)
}

@Injectable()
export class OllamaEmbedding implements EmbeddingProtocol {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async embed(text: string): Promise<Array<number>> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: { 'content-type': mediaType },
      body: JSON.stringify({ model: this.model, input: text }),
    })
    const okRequest = response.ok

    if (!okRequest) { throw failure(`${response.status}`) }

    const parsed = (await response.json()) as Reply
    const first = parsed.embeddings?.[0]

    if (first === undefined) { throw failure('Ollama returned no embedding.') }

    return first
  }
}
