import type { WagerTransaction } from '../../../../domain/wager/wager'
import { IntegrationEvent } from '../integration-event'
import type { IntegrationEventType } from '../types'
import type { WagerEventType } from './types'

type Context = IntegrationEventType.Context
type Data = WagerEventType.ProcessedData
type Input = IntegrationEventType.Input<Data>

const event = {
  type: 'WagerTransactionProcessed',
  version: 1,
}

export class WagerTransactionProcessed extends IntegrationEvent<Data> {
  readonly eventType = event.type
  readonly version = event.version

  private constructor(input: Input) {
    super(input)
  }

  static from(wager: WagerTransaction, context: Context): WagerTransactionProcessed {
    const aggregateId = wager.id
    const correlationId = context.correlationId
    const causationId = context.causationId
    const occurredAt = context.occurredAt
    const money = wager.money.toJSON()
    const data = {
      transactionId: wager.id,
      providerId: wager.providerId,
      externalTransactionId: wager.externalTransactionId,
      playerId: wager.playerId,
      walletId: wager.walletId,
      roundId: wager.roundId,
      gameId: wager.gameId,
      kind: wager.kind,
      status: wager.status,
      money,
    }
    const input = { aggregateId, correlationId, causationId, occurredAt, data }

    return new WagerTransactionProcessed(input)
  }
}
