import { afterEach, describe, expect, mock, test } from 'bun:test'
import { OllamaEmbedding } from '../ollama-embedding'

const baseUrl = 'http://ollama:11434'
const model = 'embeddinggemma'
const path = 'api/embed'
const originalFetch = globalThis.fetch

type FetchReply = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

const reply = (ok: boolean, status: number, body: unknown): FetchReply => ({
  ok,
  status,
  json: () => Promise.resolve(body),
})

const stubFetch = (body: FetchReply): void => {
  globalThis.fetch = mock(() => Promise.resolve(body)) as unknown as typeof fetch
}

describe('OllamaEmbedding', () => {
  afterEach(() => {
    mock.restore()
    globalThis.fetch = originalFetch
  })

  test('embed - WHEN Ollama answers SHOULD return the first vector', async () => {
    const stub = mock((_input: string, _init: unknown) => Promise.resolve(reply(true, 200, { embeddings: [[1, 2, 3]] })))

    globalThis.fetch = stub as unknown as typeof fetch
    const embedding = new OllamaEmbedding(baseUrl, model)
    const vector = await embedding.embed('a rejected bet')

    expect(vector).toEqual([1, 2, 3])

    const [input, init] = stub.mock.calls[0] as [string, { method: string, headers: Record<string, string>, body: string }]
    expect(input).toBe(`${baseUrl}/${path}`)
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ model, input: 'a rejected bet' }))
  })

  test('embed - WHEN the server refuses SHOULD throw with the status', async () => {
    stubFetch(reply(false, 500, {}))

    const embedding = new OllamaEmbedding(baseUrl, model)
    await expect(embedding.embed('x')).rejects.toThrow('500')
  })

  test('embed - WHEN Ollama returns no vector SHOULD throw', async () => {
    stubFetch(reply(true, 200, { embeddings: [] }))

    const embedding = new OllamaEmbedding(baseUrl, model)
    await expect(embedding.embed('x')).rejects.toThrow('Ollama returned no embedding.')
  })
})
