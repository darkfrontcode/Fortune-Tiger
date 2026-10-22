import { Inject, Injectable } from '@nestjs/common'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { IdempotencyService } from '../../../idempotencies/idempotency.service'
import type { IdempotencyType } from '../../../idempotencies/types'
import type { WagerGatewayProtocol } from '../../../protocols'
import { WAGER_GATEWAY } from '../../tokens'
import { TransactionsType } from '../types'

type SubmitInput = TransactionsType.SubmitInput
type SubmitOutput = TransactionsType.SubmitOutput
type Payload = IdempotencyType.Payload

@Injectable()
export class SubmitWagerUseCase {
  constructor(
    @Inject(WAGER_GATEWAY) private readonly gateway: WagerGatewayProtocol,
    private readonly idempotency: IdempotencyService,
  ) {}

  execute(input: SubmitInput): Promise<SubmitOutput> {
    const opening = input.kind === WagerTransactionKind.OPENING

    if (opening) {
      const output = this.rejectOpening(input.id)

      return Promise.resolve(output)
    }

    const payload = this.payload(input)
    const payloadHash = this.idempotency.hash(payload)
    const wagerInput = this.wagerInput(input, payloadHash)
    const wager = WagerTransaction.create(wagerInput)

    return this.gateway.submit(wager, input.at, input.inbox)
  }

  private rejectOpening(transactionId: string): SubmitOutput {
    const status = WagerTransactionStatus.REJECTED
    const balance = '0.00'
    const idempotentReplay = false
    const failureCode = FailureCode.OPENING_NOT_ALLOWED

    return {
      transactionId,
      status,
      balance,
      idempotentReplay,
      failureCode,
    }
  }

  private payload(input: SubmitInput): Payload {
    return {
      providerId: input.providerId,
      externalTransactionId: input.externalTransactionId,
      playerId: input.playerId,
      walletId: input.walletId,
      roundId: input.roundId,
      gameId: input.gameId,
      kind: input.kind,
      money: input.money,
      referenceExternalTransactionId: input.referenceExternalTransactionId,
    }
  }

  private wagerInput(input: SubmitInput, payloadHash: string) {
    return {
      id: input.id,
      providerId: input.providerId,
      externalTransactionId: input.externalTransactionId,
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      walletId: input.walletId,
      playerId: input.playerId,
      roundId: input.roundId,
      gameId: input.gameId,
      kind: input.kind,
      money: input.money,
      referenceExternalTransactionId: input.referenceExternalTransactionId,
      createdAt: input.at,
    }
  }
}
