import { Inject, Injectable } from '@nestjs/common'
import { METRIC } from '@application/observability'
import { metricNames } from '@application/observability'
import type { MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { IdempotencyService } from '../../idempotencies'
import type { IdempotencyType } from '../../idempotencies'
import type { WagerGatewayProtocol } from '../protocols'
import { WAGER_GATEWAY } from '../tokens'
import { WagersType } from '../types'

type SubmitInput = WagersType.SubmitInput
type SubmitOutput = WagersType.SubmitOutput
type Payload = IdempotencyType.Payload

const noElapsed = 0

const statusMetrics = {
  [WagerTransactionStatus.PENDING]: metricNames.transactionPending,
  [WagerTransactionStatus.PENDING_REFERENCE]: metricNames.transactionPendingReference,
  [WagerTransactionStatus.PROCESSED]: metricNames.transactionProcessed,
  [WagerTransactionStatus.REJECTED]: metricNames.transactionRejected,
  [WagerTransactionStatus.FAILED]: metricNames.transactionFailed,
}

@Injectable()
export class SubmitWagerUseCase {
  constructor(
    @Inject(WAGER_GATEWAY) private readonly gateway: WagerGatewayProtocol,
    private readonly idempotency: IdempotencyService,
    @Inject(METRIC) private readonly metric: MetricProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  async execute(input: SubmitInput): Promise<SubmitOutput> {
    const startedAt = this.clock.now().getTime()
    const opening = input.kind === WagerTransactionKind.OPENING

    if (opening) {
      const output = this.rejectOpening(input.id)
      this.record(output, startedAt)

      return output
    }

    const payload = this.payload(input)
    const payloadHash = this.idempotency.hash(payload)
    const wagerInput = this.wagerInput(input, payloadHash)
    const wager = WagerTransaction.create(wagerInput)
    const output = await this.gateway.submit(wager, input.at, input.inbox)

    this.record(output, startedAt)

    return output
  }

  private record(output: SubmitOutput, startedAt: number): void {
    const elapsed = Math.max(this.clock.now().getTime() - startedAt, noElapsed)

    this.metric.increment(statusMetrics[output.status])

    if (output.idempotentReplay) { this.metric.increment(metricNames.duplicate) }

    this.metric.observe(metricNames.transactionLatency, elapsed)
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
