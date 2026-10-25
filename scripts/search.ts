import { createConnection } from 'mongoose'
import type { Connection } from 'mongoose'
import { Environment } from '../src/infrastructure/environment'
import { searchableCollection, searchableEventSchema, searchableModelName } from '../src/infrastructure/search'
import type { SearchType } from '@application/searches'

const success = 0
const failure = 1
const batchSize = 50
const mediaType = 'application/json'
const embedPath = 'api/embed'
const vectorDimension = 768

type AuditEvent = {
  eventId: string
  eventType: string
  occurredAt: Date
  wagerId?: string
  actor?: { type: string, id?: string }
  metadata: Record<string, string>
}

type SearchIndex = {
  name: string
  queryable?: boolean
}

const environment = new Environment()

const summary = (event: AuditEvent): string => {
  const parts = [event.eventType]
  const kind = event.metadata.kind
  const status = event.metadata.status
  const direction = event.metadata.direction

  if (kind !== undefined) { parts.push(`kind ${kind}`) }

  if (status !== undefined) { parts.push(`status ${status}`) }

  if (direction !== undefined) { parts.push(`direction ${direction}`) }

  return parts.join(', ')
}

const embedOne = async (text: string): Promise<Array<number>> => {
  const response = await fetch(`${environment.ollamaBaseUrl}/${embedPath}`, {
    method: 'POST',
    headers: { 'content-type': mediaType },
    body: JSON.stringify({ model: environment.ollamaEmbeddingModel, input: text }),
  })

  if (!response.ok) { throw new Error(`Ollama answered ${response.status}.`) }

  const body = (await response.json()) as { embeddings?: Array<Array<number>> }
  const vector = body.embeddings?.[0]

  if (vector === undefined || vector.length === 0) { throw new Error('Ollama returned no embedding.') }

  return vector
}

const ensureModel = async (): Promise<void> => {
  const embedding = await embedOne('ok').catch(() => undefined)

  if (embedding !== undefined) { return }

  console.error(`❌ Ollama is not answering at ${environment.ollamaBaseUrl}.`)
  console.error('❌ Start it with "docker compose --profile search up -d" and pull the embedding model:')
  console.error('❌ docker exec -it $(docker compose ps -q ollama) ollama pull embeddinggemma')

  process.exit(failure)
}

const indexPollIntervalMs = 500
const indexPollLimit = 120
const indexNotReadyMessage = 'The search index did not become queryable in time.'

const indexReady = async (connection: Connection): Promise<void> => {
  for (let attempt = 0; attempt < indexPollLimit; attempt += 1) {
    const listed = await connection.collection(searchableCollection).listSearchIndexes().toArray()
    const indexes = listed as unknown as Array<SearchIndex>
    const found = indexes.find((index) => index.name === environment.searchVectorIndex)

    if (found?.queryable === true) { return }

    await new Promise((resolve) => setTimeout(resolve, indexPollIntervalMs))
  }

  throw new Error(indexNotReadyMessage)
}

const vectorIndex = async (connection: Connection): Promise<void> => {
  const collection = connection.collection(searchableCollection)
  const indexes = await collection.listSearchIndexes().toArray()
  const exists = indexes.some((index) => index.name === environment.searchVectorIndex)

  if (!exists) {
    await collection.createSearchIndex({
      name: environment.searchVectorIndex,
      definition: {
        mappings: {
          dynamic: false,
          fields: {
            embedding: {
              type: 'vector',
              numDimensions: vectorDimension,
              similarity: 'cosine',
            },
          },
        },
      },
    })
    console.log(`   created search index ${environment.searchVectorIndex}`)
  }

  await indexReady(connection)
}

const documents = async (source: ReturnType<typeof createConnection>): Promise<Array<AuditEvent>> => {
  const rows = await source.collection('audit_events').find().limit(0).toArray()

  return rows as unknown as Array<AuditEvent>
}

const main = async (): Promise<number> => {
  console.log('🚀 Fortune Tiger semantic search seed\n')

  if (!environment.vectorSearch) {
    console.error('❌ Semantic search is disabled in .env (VECTOR_SEARCH_ENABLED).')
    console.error('❌ Start the search stack and run again: docker compose --profile search up -d')

    return failure
  }

  await ensureModel()

  const audit = createConnection(environment.mongoUrl)
  const search = createConnection(environment.searchMongoUrl)
  await Promise.all([audit.asPromise(), search.asPromise()])
  const model = search.model<SearchType.Schema>(searchableModelName, searchableEventSchema)

  const rows = await documents(audit)

  console.log(`Found ${rows.length} audit events.\n`)

  let written = 0

  for (let cursor = 0; cursor < rows.length; cursor += batchSize) {
    const slice = rows.slice(cursor, cursor + batchSize)

    for (const row of slice) {
      const text = summary(row)
      const embedding = await embedOne(text)
      const document: SearchType.Schema = {
        id: row.eventId,
        eventType: row.eventType,
        kind: row.metadata.kind ?? String(),
        status: row.metadata.status ?? String(),
        failureCode: undefined,
        text,
        occurredAt: row.occurredAt,
        providerId: row.actor?.id ?? String(),
        wagerId: row.wagerId,
        embedding,
      }

      await model.updateOne({ id: document.id }, { $set: document }, { upsert: true })
      written += 1
    }
    console.log(`   wrote ${written} documents`)
  }

  await vectorIndex(search)

  await search.close()
  await audit.close()

  console.log(`\n✅ Seeded ${written} searchable events.`)

  return success
}

const fail = (error: unknown): number => {
  console.error(error)

  return failure
}

process.exit(await main().catch(fail))
