import { Inject, Injectable } from '@nestjs/common'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import type { WalletOpeningProtocol } from '@application/wallets'
import type { Money } from '@domain/money/money'
import type { Wallet } from '@domain/wallet/wallet'
import { WALLET_OPENING } from '../tokens'
import { platformProvider } from '../data'

type Input = {
  id: string
  playerId: string
  initialBalance: Money
}

type Output = Promise<Wallet>

const operation = 'OpenWalletUseCase'
const openingPrefix = 'opening'
const separator = ':'

@Injectable()
export class OpenWalletUseCase {
  constructor(
    @Inject(WALLET_OPENING) private readonly opening: WalletOpeningProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    private readonly journey: JourneyService,
  ) {}

  async execute(input: Input): Output {
    const startedAt = this.clock.now()
    const flowId = `${openingPrefix}${separator}${input.id}`
    const openingInput = {
      id: input.id,
      playerId: input.playerId,
      initialBalance: input.initialBalance,
      openedAt: startedAt,
    }

    try {
      const wallet = await this.opening.open(openingInput)
      this.track(flowId, input, startedAt, JourneyOutcome.SUCCEEDED)

      return wallet
    } catch (error) {
      this.track(flowId, input, startedAt, JourneyOutcome.FAILED)

      throw error
    }
  }

  private track(
    flowId: string,
    input: Input,
    startedAt: Date,
    outcome: JourneyOutcome,
  ): void {
    const step = {
      flowId,
      stage: JourneyStage.USE_CASE,
      operation: operation,
      outcome,
      startedAt,
      providerId: platformProvider,
      playerId: input.playerId,
      wagerId: undefined,
      walletId: input.id,
      failureCode: undefined,
    }

    void this.journey.record(step)
  }
}
