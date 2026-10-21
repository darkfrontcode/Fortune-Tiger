import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import { WagerTransaction } from '../../../domain/wager/wager'
import { IdempotencyService } from '../../idempotencies/idempotency.service'
import type { IdempotencyType } from '../../idempotencies/types'
import type { WagerGatewayProtocol } from '../../protocols'
import { TransactionsType } from './types'

type SubmitInput = TransactionsType.SubmitInput
type SubmitOutput = TransactionsType.SubmitOutput
type Payload = IdempotencyType.Payload

export class WagerService {
  private readonly idempotency = new IdempotencyService()

  constructor(private readonly gateway: WagerGatewayProtocol) {}

  submit(input: SubmitInput): Promise<SubmitOutput> {
    const opening = input.kind === WagerTransactionKind.OPENING

    if (opening) {
      const output = WagerService.rejectOpening(input.id)

      return Promise.resolve(output)
    }

    const payload = WagerService.payload(input)
    const payloadHash = this.idempotency.hash(payload)
    const wagerInput = WagerService.wagerInput(input, payloadHash)
    const wager = WagerTransaction.create(wagerInput)

    return this.gateway.submit(wager, input.at, input.inbox)
  }

  private static rejectOpening(transactionId: string): SubmitOutput {
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

  private static payload(input: SubmitInput): Payload {
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

  private static wagerInput(input: SubmitInput, payloadHash: string) {
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
