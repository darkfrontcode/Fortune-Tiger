const defaultPort = 3000
const defaultRegion = 'us-east-1'
const defaultCredential = 'test'
const defaultMetricsBackend = 'prometheus'
const defaultAuthMode = 'anonymous'
const defaultMongoUrl = 'mongodb://127.0.0.1:27017/fortune_tiger_audit'
const defaultRedisUrl = 'redis://127.0.0.1:6379'
const defaultSearchMongoUrl = 'mongodb://127.0.0.1:27018/fortune_tiger_search?directConnection=true'
const defaultEmbeddingProvider = 'ollama'
const defaultOllamaBaseUrl = 'http://localhost:11434'
const defaultOllamaEmbeddingModel = 'embeddinggemma'
const defaultSearchCollection = 'searchable_events'
const defaultSearchIndex = 'events_vector_index'
const defaultTopK = 5
const defaultMaxTextLength = 4000
const empty = String()

export class Environment {
  get port(): number {
    return Number(process.env.PORT ?? defaultPort)
  }

  get pretty(): boolean {
    return process.env.LOG_PRETTY === 'true'
  }

  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL
  }

  get metricsBackend(): string {
    return process.env.METRICS_BACKEND ?? defaultMetricsBackend
  }

  get region(): string {
    return process.env.AWS_REGION ?? defaultRegion
  }

  get endpoint(): string | undefined {
    return process.env.AWS_ENDPOINT_URL
  }

  get accessKeyId(): string {
    return process.env.AWS_ACCESS_KEY_ID ?? defaultCredential
  }

  get secretAccessKey(): string {
    return process.env.AWS_SECRET_ACCESS_KEY ?? defaultCredential
  }

  get queueUrl(): string {
    return process.env.SQS_QUEUE_URL ?? empty
  }

  get deadLetterQueueUrl(): string {
    return process.env.SQS_DEAD_LETTER_QUEUE_URL ?? empty
  }

  get eventsQueueUrl(): string {
    return process.env.SQS_EVENTS_QUEUE_URL ?? empty
  }

  get eventsDeadLetterQueueUrl(): string {
    return process.env.SQS_EVENTS_DEAD_LETTER_QUEUE_URL ?? empty
  }

  get mongoUrl(): string {
    return process.env.MONGODB_URL ?? defaultMongoUrl
  }

  get vectorSearch(): boolean {
    return process.env.VECTOR_SEARCH_ENABLED === 'true'
  }

  get searchMongoUrl(): string {
    return process.env.SEARCH_MONGODB_URL ?? defaultSearchMongoUrl
  }

  get embeddingProvider(): string {
    return process.env.EMBEDDING_PROVIDER ?? defaultEmbeddingProvider
  }

  get ollamaBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL ?? defaultOllamaBaseUrl
  }

  get ollamaEmbeddingModel(): string {
    return process.env.OLLAMA_EMBEDDING_MODEL ?? defaultOllamaEmbeddingModel
  }

  get searchEventsCollection(): string {
    return process.env.MONGODB_EVENTS_COLLECTION ?? defaultSearchCollection
  }

  get searchVectorIndex(): string {
    return process.env.MONGODB_VECTOR_INDEX ?? defaultSearchIndex
  }

  get vectorSearchTopK(): number {
    return Number(process.env.VECTOR_SEARCH_TOP_K ?? defaultTopK)
  }

  get vectorSearchMaxTextLength(): number {
    return Number(process.env.VECTOR_SEARCH_MAX_TEXT_LENGTH ?? defaultMaxTextLength)
  }

  get authMode(): string {
    return process.env.AUTH_MODE ?? defaultAuthMode
  }

  get oidcIssuer(): string | undefined {
    return process.env.OIDC_ISSUER
  }

  get oidcAudience(): string | undefined {
    return process.env.OIDC_AUDIENCE
  }

  get oidcJwksUrl(): string | undefined {
    return process.env.OIDC_JWKS_URL
  }

  get redisUrl(): string {
    return process.env.REDIS_URL ?? defaultRedisUrl
  }
}
