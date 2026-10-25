import { describe, expect, test } from 'bun:test'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import type { WalletOpeningInput, WalletOpeningProtocol } from '@application/wallets'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { JourneyStoreProtocol, JourneyType } from '@application/journeys'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { OpenWalletUseCase } from '../open-wallet.use-case'

class JourneyStore implements JourneyStoreProtocol {
  readonly steps: Array<JourneyType.Schema> = []

  async record(step: JourneyType.Schema): Promise<void> {
    this.steps.push(step)
  }

  timeline(): Promise<Array<JourneyType.Schema>> {
    return Promise.resolve(this.steps)
  }
}

class Metric implements MetricProtocol {
  increment(): void {}

  observe(): void {}

  render(): Promise<string> {
    return Promise.resolve(String())
  }
}

class Logger implements LoggerProtocol {
  child(): LoggerProtocol {
    return this
  }

  warn(): void {}
}

class Clock implements ClockProtocol {
  now(): Date {
    return openedAt
  }
}

const openedAt = new Date('2025-01-01T00:00:00.000Z')
const playerId = 'player-1'
const id = 'wallet-wallet-1'
const initialBalance = Money.from({ amount: '10.00', currency: 'USD' })

const wallet = Wallet.open({
  id,
  playerId,
  balance: initialBalance,
  openedAt,
})

const useCase = (
  opening: WalletOpeningProtocol,
  store: JourneyStore,
): OpenWalletUseCase => new OpenWalletUseCase(opening, new Clock(), new JourneyService(store, new Clock(), new Logger(), new Metric()))

describe('OpenWalletUseCase', () => {
  test('opens a wallet with the current time and records a use case step', async () => {
    const calls: Array<WalletOpeningInput> = []
    const journey = new JourneyStore()
    const opening: WalletOpeningProtocol = {
      open: async (input) => {
        calls.push(input)

        return wallet
      },
    }

    await useCase(opening, journey).execute({ id, playerId, initialBalance })

    expect(calls).toEqual([{ id, playerId, initialBalance, openedAt }])
    expect(journey.steps).toHaveLength(1)
    const step = journey.steps[0]

    expect(step?.flowId).toBe(`opening:${id}`)
    expect(step?.stage).toBe(JourneyStage.USE_CASE)
    expect(step?.operation).toBe('OpenWalletUseCase')
    expect(step?.outcome).toBe(JourneyOutcome.SUCCEEDED)
    expect(step?.providerId).toBe('fortune-tiger')
    expect(step?.playerId).toBe(playerId)
    expect(step?.walletId).toBe(id)
  })

  test('records a failed step and rethrows when the opening fails', async () => {
    const journey = new JourneyStore()
    const opening: WalletOpeningProtocol = {
      open: () => Promise.reject(new Error('conflict')),
    }

    await expect(useCase(opening, journey).execute({ id, playerId, initialBalance })).rejects.toThrow(
      'conflict',
    )

    expect(journey.steps[0]?.outcome).toBe(JourneyOutcome.FAILED)
  })
})
