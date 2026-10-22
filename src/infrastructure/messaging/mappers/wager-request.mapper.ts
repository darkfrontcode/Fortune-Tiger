import { Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { WagersType } from '@application/wagers'
import type { WagerRequest } from '../messages'
import type { MapperProtocol } from './mapper.protocol'

type Input = {
  request: WagerRequest
  receivedAt: Date
  consumerName: string
}

type Output = WagersType.SubmitInput

@Injectable()
export class WagerRequestMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const { request, receivedAt, consumerName } = input
    const data = request.data

    return {
      id: uuidv7(),
      idempotencyKey: data.idempotencyKey,
      providerId: data.providerId,
      externalTransactionId: data.externalTransactionId,
      playerId: data.playerId,
      walletId: data.walletId,
      roundId: data.roundId,
      gameId: data.gameId,
      kind: data.kind,
      money: data.money,
      referenceExternalTransactionId: data.referenceExternalTransactionId,
      at: request.occurredAt,
      inbox: {
        messageId: request.messageId,
        consumerName,
        receivedAt,
      },
    }
  }
}
