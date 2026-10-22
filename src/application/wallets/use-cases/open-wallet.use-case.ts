import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import type { WalletOpeningProtocol } from '@application/wallets'
import type { Money } from '@domain/money/money'
import type { Wallet } from '@domain/wallet/wallet'
import { CLOCK } from '@application/time'
import { WALLET_OPENING } from '../tokens'

type Input = {
  playerId: string
  initialBalance: Money
}

type Output = Promise<Wallet>

@Injectable()
export class OpenWalletUseCase {
  constructor(
    @Inject(WALLET_OPENING) private readonly opening: WalletOpeningProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  execute(input: Input): Output {
    const { playerId, initialBalance } = input
    const openedAt = this.clock.now()
    const openingInput = { playerId, initialBalance, openedAt }

    return this.opening.open(openingInput)
  }
}
