import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { PublisherProtocol } from '@infrastructure/messaging/publishers'
import { PUBLISHER } from '../tokens'
import { OutboxMessageRepository } from '../../persistence/outbox'
import type { OutboxMessage } from '../messages'

type Input = {
  at: Date
  limit: number
}

type Output = {
  published: number
  retried: number
}

const EMPTY = 0

@Injectable()
export class OutboxPublisher {
  constructor(
    @Inject(MikroORM) private readonly orm: MikroORM,
    @Inject(PUBLISHER) private readonly publisher: PublisherProtocol,
  ) {}

  async publish(input: Input): Promise<Output> {
    const { at, limit } = input

    return this.orm.em.transactional(async (manager) => {
      const outbox = new OutboxMessageRepository(manager)
      const due = await outbox.findDueForUpdate(at, limit)
      const started = Promise.resolve({ published: EMPTY, retried: EMPTY })
      const toSettled = async (chain: Promise<Output>, message: OutboxMessage) => {
        const report = await chain
        const published = await this.publishOne(message, at)
        const total = published ? report.published + 1 : report.retried + 1
        const settled = published
          ? { ...report, published: total }
          : { ...report, retried: total }

        return settled
      }
      const report = await due.reduce(toSettled, started)

      await outbox.updateMany(due)

      return report
    })
  }

  private async publishOne(message: OutboxMessage, at: Date): Promise<boolean> {
    const input = { id: message.id, aggregateId: message.aggregateId, payload: message.payload }

    try {
      await this.publisher.publish(input)
      message.markPublished(at)

      return true
    } catch {
      message.scheduleRetry(at)

      return false
    }
  }
}
