import { Inject, Injectable } from '@nestjs/common'
import { INVALID_SEARCH_QUERY_MESSAGE } from '../data'
import type { EmbeddingProtocol, VectorSearchProtocol } from '../protocols'
import { EMBEDDING, VECTOR_SEARCH } from '../tokens'
import type { SearchType } from '../types'

type Input = SearchType.SimilarInput
type Output = Promise<SearchType.SearchOutput>

const minimumLimit = 1

@Injectable()
export class SearchSimilarEventsUseCase {
  constructor(
    @Inject(EMBEDDING) private readonly embedding: EmbeddingProtocol,
    @Inject(VECTOR_SEARCH) private readonly vectorSearch: VectorSearchProtocol,
    private readonly topK: number,
    private readonly maxTextLength: number,
  ) {}

  async execute(input: Input): Output {
    this.guard(input)
    const limit = this.limit(input.limit)
    const query = input.query.trim()
    const embedding = await this.embedding.embed(query)
    const items = await this.vectorSearch.search({
      embedding,
      eventType: input.eventType,
      limit,
    })

    return { items }
  }

  private guard(input: Input): void {
    const length = input.query.trim().length
    const valid = length > 0 && length <= this.maxTextLength

    if (!valid) { throw new Error(INVALID_SEARCH_QUERY_MESSAGE) }
  }

  private limit(value: number | undefined): number {
    const absent = value === undefined
    const requested = absent ? this.topK : value

    return Math.max(minimumLimit, Math.min(requested, this.topK))
  }
}
