import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { SearchSimilarEventsUseCase, SearchType } from '@application/searches'

const toolName = 'search_similar_events'
const toolDescription = 'Searches past events and failures by meaning and returns the nearest matches with their score.'

const title = 'Search similar events'
const textType = 'text'

const inputSchema = {
  query: z.string().min(1).describe('The description of the event or failure to search for.'),
  eventType: z.string().optional().describe('Optional integration event type to filter, e.g. WagerTransactionRejected.'),
  limit: z.number().int().min(1).max(50).optional().describe('Maximum number of matches. The use case caps it.'),
}

type Arguments = {
  query: string
  eventType: string | undefined
  limit: number | undefined
}

const formatField = (name: string, value: unknown): string => `${name}: ${String(value)}`

const formatResult = (result: SearchType.Result): string => {
  const parts = [
    formatField('score', result.score.toFixed(4)),
    formatField('eventType', result.eventType),
    formatField('kind', result.kind),
    formatField('status', result.status),
  ]

  if (result.failureCode !== undefined) { parts.push(formatField('failureCode', result.failureCode)) }

  if (result.wagerId !== undefined) { parts.push(formatField('wagerId', result.wagerId)) }

  if (result.occurredAt !== undefined) { parts.push(formatField('occurredAt', result.occurredAt.toISOString())) }

  return parts.join(', ')
}

export const formatSearchOutput = (output: SearchType.SearchOutput): string => {
  const lines = output.items.map(formatResult)
  const header = `${lines.length} similar event(s):`

  return [header, ...lines].join('\n')
}

const parseError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error)
}

export const registerSearchTool = (server: McpServer, useCase: SearchSimilarEventsUseCase): void => {
  server.registerTool(
    toolName,
    {
      title,
      description: toolDescription,
      inputSchema,
    },
    async (arguments_) => {
      const args = arguments_ as Arguments

      try {
        const output = await useCase.execute({
          query: args.query,
          eventType: args.eventType,
          limit: args.limit,
        })
        const text = formatSearchOutput(output)

        return { content: [{ type: textType, text }] }
      } catch (error) {
        const text = parseError(error)

        return { content: [{ type: textType, text }], isError: true }
      }
    },
  )
}
