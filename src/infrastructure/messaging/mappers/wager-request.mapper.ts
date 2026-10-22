import { Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { MapperProtocol } from '@application/protocols'
import type { TransactionsType } from '@application/transactions'
import type { WagerRequest } from '../messages'

type Input = {
  request: WagerRequest
  receivedAt: Date
  consumerName: string
}

type Output = TransactionsType.SubmitInput

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
