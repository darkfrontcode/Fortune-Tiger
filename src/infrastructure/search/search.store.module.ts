import { EMBEDDING, VECTOR_SEARCH } from '@application/searches/tokens'
import { Module } from '@nestjs/common'
import { Environment, EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { MongoVectorSearch } from './mongo-vector-search'
import { OllamaEmbedding } from './ollama-embedding'
import { SearchConnection } from './search.connection'

const moduleImports = [EnvironmentModule, ObservabilityModule]
const moduleProviders = [SearchConnection]

const resolveEmbedding = (environment: Environment): OllamaEmbedding => {
  return new OllamaEmbedding(environment.ollamaBaseUrl, environment.ollamaEmbeddingModel)
}

const resolveVectorSearch = (
  connection: SearchConnection,
  environment: Environment,
): MongoVectorSearch => {
  return new MongoVectorSearch(connection, environment.searchVectorIndex)
}

@Module({
  imports: moduleImports,
  providers: [
    ...moduleProviders,
    { provide: OllamaEmbedding, useFactory: resolveEmbedding, inject: [Environment] },
    { provide: MongoVectorSearch, useFactory: resolveVectorSearch, inject: [SearchConnection, Environment] },
    { provide: EMBEDDING, useExisting: OllamaEmbedding },
    { provide: VECTOR_SEARCH, useExisting: MongoVectorSearch },
  ],
  exports: [EMBEDDING, VECTOR_SEARCH],
})
export class SearchStoreModule {}
