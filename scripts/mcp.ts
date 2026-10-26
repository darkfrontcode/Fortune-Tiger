import 'reflect-metadata'
import type { INestApplicationContext } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SearchesModule } from '@application/searches'
import { SearchSimilarEventsUseCase } from '@application/searches'
import { Environment } from '../src/infrastructure/environment'
import { registerSearchTool } from '../src/infrastructure/mcp'

const name = 'fortune-tiger-search'
const version = '1.0.0'
const success = 0
const failure = 1

const hint = (message: string): never => {
  console.error(`❌ ${message}`)
  console.error('❌ To enable semantic search:')
  console.error('   - docker compose --profile search up -d')
  console.error('   - bun run scripts/search.ts')
  console.error('   - VECTOR_SEARCH_ENABLED=true')
  process.exit(failure)
}

const main = async (): Promise<number> => {
  const context: INestApplicationContext = await NestFactory.createApplicationContext(SearchesModule, {
    logger: false,
  })
  const environment = context.get(Environment)
  const enabled = environment.vectorSearch

  if (!enabled) { hint('Semantic search is disabled.') }

  const useCase = context.get(SearchSimilarEventsUseCase)
  const server = new McpServer({ name, version })
  const transport = new StdioServerTransport()

  registerSearchTool(server, useCase)
  await server.connect(transport)

  console.log('🚀 Fortune Tiger MCP search server is serving on stdio.')

  const close = async (): Promise<void> => {
    await server.close()
    await context.close()
    process.exit(success)
  }
  const terminate = async (): Promise<void> => close()
  const interrupt = async (): Promise<void> => close()

  process.once('SIGINT', interrupt)
  process.once('SIGTERM', terminate)

  return success
}

const fail = (error: unknown): void => {
  console.error(error)
  process.exit(failure)
}

await main().catch(fail)
