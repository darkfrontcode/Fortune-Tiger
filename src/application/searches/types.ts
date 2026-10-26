export namespace SearchType {
  export type Schema = {
    id: string
    eventType: string
    kind: string
    status: string
    failureCode: string | undefined
    text: string
    occurredAt: Date
    providerId: string
    wagerId: string | undefined
    embedding: Array<number>
  }

  export type SimilarInput = {
    query: string
    eventType: string | undefined
    limit: number | undefined
  }

  export type Query = {
    embedding: Array<number>
    eventType: string | undefined
    limit: number
  }

  export type Result = {
    id: string
    eventType: string
    kind: string
    status: string
    failureCode: string | undefined
    score: number
    wagerId: string | undefined
    occurredAt: Date | undefined
  }

  export type SearchOutput = {
    items: Array<Result>
  }
}
