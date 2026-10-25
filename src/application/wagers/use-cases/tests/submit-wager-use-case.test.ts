import { describe, expect, test } from 'bun:test'
import { Money } from '@domain/money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import type { MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { IdempotencyService } from '../../../idempotencies'
import type { WagerGatewayProtocol } from '../../protocols'
import { WagersType } from '../../types'
import { JourneyOutcome } from '@application/journeys'
import type { JourneyService, JourneyStoreProtocol, JourneyType } from '@application/journeys'
import { SubmitWagerUseCase } from '../submit-wager.use-case'

type SubmitInput = WagersType.SubmitInput
type SubmitOutput = WagersType.SubmitOutput

class Gateway implements WagerGatewayProtocol {
  readonly calls: WagerTransaction[] = []

  readonly output: SubmitOutput = {
    transactionId: 'gateway-tx',
    status: WagerTransactionStatus.PROCESSED,
    balance: '10.00',
    idempotentReplay: false,
    failureCode: undefined,
  }

  submit(wager: WagerTransaction, _at: Date): Promise<SubmitOutput> {
    this.calls.push(wager)

    return Promise.resolve(this.output)
  }
}

class Metric implements MetricProtocol {
  readonly counts = new Map<string, number>()
  readonly observations = new Map<string, number>()

  increment(name: string): void {
    const stored = this.counts.get(name) ?? 0

    this.counts.set(name, stored + 1)
  }

  observe(name: string, milliseconds: number): void {
    this.observations.set(name, milliseconds)
  }

  render(): Promise<string> {
    return Promise.resolve(String())
  }
}

class Clock implements ClockProtocol {
  now(): Date {
    return instant
  }
}

const instant = new Date('2026-01-01T00:00:00.000Z')

const money = Money.from({ amount: '10.00', currency: 'BRL' })

const base = (): SubmitInput => ({
  id: 'tx-1',
  idempotencyKey: 'provider:ext-1',
  providerId: 'provider',
  externalTransactionId: 'ext-1',
  playerId: 'player-1',
  walletId: 'wallet-1',
  roundId: 'round-1',
  gameId: 'fortune-tiger',
  kind: WagerTransactionKind.BET,
  money,
  referenceExternalTransactionId: undefined,
  at: instant,
})

class Journey implements JourneyStoreProtocol {
  readonly steps: Array<JourneyType.Schema> = []

  record(step: JourneyType.Schema): Promise<void> {
    this.steps.push(step)

    return Promise.resolve()
  }

  timeline(): Promise<Array<JourneyType.Schema>> {
    return Promise.resolve(this.steps)
  }
}

describe('SubmitWagerUseCase', () => {
  test('opening - WHEN kind is OPENING SHOULD reject without calling the gateway', async () => {
    const gateway = new Gateway()
    const journey = new Journey()
    const useCase = new SubmitWagerUseCase(
      gateway,
      new IdempotencyService(),
      new Metric(),
      new Clock(),
      journey as unknown as JourneyService,
    )
    const input = base()
    const opening = { ...input, kind: WagerTransactionKind.OPENING }
    const output = await useCase.execute(opening)

    expect(gateway.calls).toHaveLength(0)
    expect(output.status).toBe(WagerTransactionStatus.REJECTED)
    expect(output.failureCode).toBe(FailureCode.OPENING_NOT_ALLOWED)
    expect(output.idempotentReplay).toBe(false)
    expect(journey.steps[0]?.outcome).toBe(JourneyOutcome.FAILED)
    expect(journey.steps[0]?.failureCode).toBe(FailureCode.OPENING_NOT_ALLOWED)
  })

  test('bet - WHEN kind is BET SHOULD hash the payload and call the gateway', async () => {
    const gateway = new Gateway()
    const journey = new Journey()
    const useCase = new SubmitWagerUseCase(
      gateway,
      new IdempotencyService(),
      new Metric(),
      new Clock(),
      journey as unknown as JourneyService,
    )
    const input = base()
    const output = await useCase.execute(input)

    expect(gateway.calls).toHaveLength(1)
    expect(gateway.calls[0]?.payloadHash).toHaveLength(64)
    expect(output).toEqual(gateway.output)
    expect(journey.steps[0]?.outcome).toBe(JourneyOutcome.SUCCEEDED)
  })

  test('metric - WHEN the gateway answers processed SHOULD count the status and observe the duration', async () => {
    const gateway = new Gateway()
    const metric = new Metric()
    const useCase = new SubmitWagerUseCase(
      gateway,
      new IdempotencyService(),
      metric,
      new Clock(),
      new Journey() as unknown as JourneyService,
    )
    const output = await useCase.execute(base())

    expect(output.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(metric.counts.get('wager_transactions_processed_total')).toBe(1)
    expect(metric.observations.get('wager_processing_milliseconds')).toBe(0)
  })

  test('metric - WHEN the gateway answers a replay SHOULD count the duplicate', async () => {
    const gateway = new Gateway()
    const metric = new Metric()
    const replay = { ...gateway.output, idempotentReplay: true }
    const useCase = new SubmitWagerUseCase(
      { submit: () => Promise.resolve(replay) },
      new IdempotencyService(),
      metric,
      new Clock(),
      new Journey() as unknown as JourneyService,
    )
    const output = await useCase.execute(base())

    expect(output.idempotentReplay).toBe(true)
    expect(metric.counts.get('idempotency_duplicates_total')).toBe(1)
  })

  test('journey - WHEN the gateway fails SHOULD record a failed step and rethrow', async () => {
    const journey = new Journey()
    const useCase = new SubmitWagerUseCase(
      { submit: () => Promise.reject(new Error('infrastructure')) },
      new IdempotencyService(),
      new Metric(),
      new Clock(),
      journey as unknown as JourneyService,
    )

    await expect(useCase.execute(base())).rejects.toThrow('infrastructure')

    expect(journey.steps[0]?.outcome).toBe(JourneyOutcome.FAILED)
    expect(journey.steps[0]?.flowId).toBe('provider:ext-1')
    expect(journey.steps[0]?.wagerId).toBe('tx-1')
  })
})
