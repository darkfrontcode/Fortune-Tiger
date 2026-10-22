import { INVALID_WAGER_REQUEST_MESSAGE } from './data'
import type { WagerRequestType } from './types'
import { WagerRequestGuard } from './wager-request.guard'

type Schema = WagerRequestType.Schema
type Input = WagerRequestType.Input
type Data = WagerRequestType.Data
type Envelope = WagerRequestType.Envelope

const parse = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    throw new Error(INVALID_WAGER_REQUEST_MESSAGE)
  }
}

export class WagerRequest {
  private constructor(private readonly schema: Schema) {}

  static from(input: Input): WagerRequest | null {
    const parsed = parse(input.body)
    const envelope = WagerRequestGuard.object<Envelope>(parsed)
    const integration = WagerRequestGuard.integration(envelope)

    if (integration) { return null }

    WagerRequestGuard.type(envelope.type)

    const schema: Schema = {
      messageId: WagerRequestGuard.text(envelope.messageId),
      occurredAt: WagerRequestGuard.date(envelope.occurredAt),
      data: WagerRequestGuard.data(envelope.data),
    }

    return new WagerRequest(schema)
  }

  get messageId(): string {
    return this.schema.messageId
  }

  get occurredAt(): Date {
    return this.schema.occurredAt
  }

  get data(): Data {
    return this.schema.data
  }
}
