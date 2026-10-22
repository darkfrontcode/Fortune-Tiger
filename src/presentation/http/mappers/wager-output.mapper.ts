import type { MapperProtocol } from '@application/protocols'
import type { WagerTransaction } from '@domain/wager/wager'
import type { HttpType } from '../types'

type Input = WagerTransaction
type Output = HttpType.WagerOutput

export class WagerOutputMapper implements MapperProtocol<Input, Output> {
  map(wager: WagerTransaction): Output {
    return {
      transactionId: wager.id,
      providerId: wager.providerId,
      externalTransactionId: wager.externalTransactionId,
      playerId: wager.playerId,
      walletId: wager.walletId,
      roundId: wager.roundId,
      gameId: wager.gameId,
      kind: wager.kind,
      status: wager.status,
      money: wager.money.toJSON(),
      failureCode: wager.failureCode,
      createdAt: wager.createdAt,
    }
  }
}
