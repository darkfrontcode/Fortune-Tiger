import { Inject, Injectable } from '@nestjs/common'
import { METRIC } from '@application/observability'
import { metricNames } from '@application/observability'
import type { MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
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
const operation = 'SubmitWagerUseCase'

const failedStatuses = [WagerTransactionStatus.REJECTED, WagerTransactionStatus.FAILED]

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
    private readonly journey: JourneyService,
  ) {}

  async execute(input: SubmitInput): Promise<SubmitOutput> {
    const startedAt = this.clock.now()
    const opening = input.kind === WagerTransactionKind.OPENING

    if (opening) {
      const output = this.rejectOpening(input.id)
      this.record(output, startedAt.getTime())
      this.track(input, startedAt, output)

      return output
    }

    const payload = this.payload(input)
    const payloadHash = this.idempotency.hash(payload)
    const wagerInput = this.wagerInput(input, payloadHash)
    const wager = WagerTransaction.create(wagerInput)

    try {
      const output = await this.gateway.submit(wager, input.at, input.inbox)
      this.record(output, startedAt.getTime())
      this.track(input, startedAt, output)

      return output
    } catch (error) {
      this.track(input, startedAt, undefined)

      throw error
    }
  }

  private track(input: SubmitInput, startedAt: Date, output: SubmitOutput | undefined): void {
    const failed = output === undefined || failedStatuses.includes(output.status)
    const step = {
      flowId: input.idempotencyKey,
      stage: JourneyStage.USE_CASE,
      operation: operation,
      outcome: failed ? JourneyOutcome.FAILED : JourneyOutcome.SUCCEEDED,
      startedAt,
      providerId: input.providerId,
      playerId: input.playerId,
      wagerId: output?.transactionId ?? input.id,
      walletId: input.walletId,
      failureCode: output?.failureCode,
    }

    void this.journey.record(step)
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
