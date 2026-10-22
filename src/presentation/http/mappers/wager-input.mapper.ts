import { uuidv7 } from 'uuidv7'
import type { WagersType } from '@application/wagers'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = {
  body: HttpType.WagerInput
  providerId: string
  idempotencyKey: string
  at: Date
}

type Output = WagersType.SubmitInput

export class WagerInputMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const { body, providerId, idempotencyKey, at } = input

    return {
      id: uuidv7(),
      idempotencyKey,
      providerId,
      externalTransactionId: body.externalTransactionId,
      playerId: body.playerId,
      walletId: body.walletId,
      roundId: body.roundId,
      gameId: body.gameId,
      kind: body.kind,
      money: body.money,
      referenceExternalTransactionId: body.referenceExternalTransactionId,
      at,
    }
  }
}
