import { WagerService } from '../../../application/transactions'
import { WagerRequestMapper } from '../mappers'
import { WagerRequest } from '../messages'
import { ConsumerOutcome } from './enums'
import type { ConsumerType } from './types'

const maxAttempts = 5

export class WagerConsumer {
  constructor(
    private readonly service: WagerService,
    private readonly mapper: WagerRequestMapper,
    private readonly consumerName: string,
  ) {}

  async consume(input: ConsumerType.ConsumeInput): Promise<ConsumerOutcome> {
    const { message, at } = input

    try {
      const request = WagerRequest.from({ body: message.body })

      if (request === null) { return ConsumerOutcome.ACK }

      return await this.submit(request, at, message.receiveCount)
    } catch {
      return ConsumerOutcome.DEAD_LETTER
    }
  }

  private async submit(request: WagerRequest, at: Date, receiveCount: number): Promise<ConsumerOutcome> {
    try {
      const mapped = this.mapper.map({ request, receivedAt: at, consumerName: this.consumerName })

      await this.service.submit(mapped)

      return ConsumerOutcome.ACK
    } catch {
      return this.failure(receiveCount)
    }
  }

  private failure(receiveCount: number): ConsumerOutcome {
    const exhausted = receiveCount >= maxAttempts

    if (exhausted) { return ConsumerOutcome.DEAD_LETTER }

    return ConsumerOutcome.RETRY
  }
}
