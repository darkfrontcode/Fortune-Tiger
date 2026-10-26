import { Module } from '@nestjs/common'
import { Environment, EnvironmentModule } from '@infrastructure/environment'
import { ObservabilityModule } from '@infrastructure/observability'
import { SearchStoreModule } from '@infrastructure/search'
import type { EmbeddingProtocol, VectorSearchProtocol } from './protocols'
import { EMBEDDING, VECTOR_SEARCH } from './tokens'
import { SearchSimilarEventsUseCase } from './use-cases'

const moduleImports = [SearchStoreModule, ObservabilityModule, EnvironmentModule]
const dependencies = [EMBEDDING, VECTOR_SEARCH, Environment]

const resolve = (
  embedding: EmbeddingProtocol,
  vectorSearch: VectorSearchProtocol,
  environment: Environment,
): SearchSimilarEventsUseCase => {
  return new SearchSimilarEventsUseCase(
    embedding,
    vectorSearch,
    environment.vectorSearchTopK,
    environment.vectorSearchMaxTextLength,
  )
}

@Module({
  imports: moduleImports,
  providers: [{ provide: SearchSimilarEventsUseCase, useFactory: resolve, inject: dependencies }],
  exports: [SearchSimilarEventsUseCase],
})
export class SearchesModule {}
