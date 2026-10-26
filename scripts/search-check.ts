import 'reflect-metadata'
import type { INestApplicationContext } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { SearchesModule } from '@application/searches'
import { SearchSimilarEventsUseCase } from '@application/searches'
import { Environment } from '../src/infrastructure/environment'

const success = 0
const failure = 1
const probe = 'a bet that was rejected because the balance ran out'

const main = async (): Promise<number> => {
  const context: INestApplicationContext = await NestFactory.createApplicationContext(SearchesModule, {
    logger: false,
  })
  const environment = context.get(Environment)
  const enabled = environment.vectorSearch

  if (!enabled) {
    console.error('❌ Semantic search is disabled in .env (VECTOR_SEARCH_ENABLED).')
    console.error('❌ Start the search stack and run again: docker compose --profile search up -d')

    return failure
  }

  const useCase = context.get(SearchSimilarEventsUseCase)
  const output = await useCase.execute({ query: probe, eventType: undefined, limit: environment.vectorSearchTopK })

  console.log(`🔎 "${probe}" answered ${output.items.length} matches.`)

  for (const item of output.items) {
    console.log(`   ${item.eventType} ${item.kind} ${item.status} (${item.score.toFixed(4)})`)
  }

  await context.close()

  return success
}

const fail = (error: unknown): number => {
  console.error(error)

  return failure
}

process.exit(await main().catch(fail))
