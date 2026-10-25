import { Inject, Injectable } from '@nestjs/common'
import { SubmitWagerUseCase } from '@application/wagers/use-cases'
import { WagerRequestMapper } from '../mappers'
import { WagerRequest } from '../messages'
import { CONSUMER_NAME } from './consumer-name.token'
import type { ConsumerProtocol } from './consumer.protocol'
import { ConsumerOutcome } from './enums'
import type { ConsumerType } from './types'

const maxAttempts = 5

@Injectable()
export class WagerConsumer implements ConsumerProtocol {
  constructor(
    private readonly submitWager: SubmitWagerUseCase,
    private readonly mapper: WagerRequestMapper,
    @Inject(CONSUMER_NAME) private readonly consumerName: string,
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

      await this.submitWager.execute(mapped)

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
