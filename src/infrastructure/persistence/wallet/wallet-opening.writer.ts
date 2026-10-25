import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '@application/idempotencies/idempotency.service'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { platformProvider, WalletOpeningInput, WalletOpeningProtocol } from '@application/wallets'
import { WagerMediator } from '@application/wagers/mediators'
import type { Ledger } from '@domain/ledger/ledger'
import { Money as MoneyValue } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE } from '../data'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletRepository } from './wallet.repository'

const operation = 'wallets'
const openingPrefix = 'opening'
const separator = ':'
const scope = {
  provider: platformProvider,
  game: platformProvider,
}

@Injectable()
export class WalletOpeningWriter implements WalletOpeningProtocol {
  constructor(
    @Inject(MikroORM) private readonly orm: MikroORM,
    private readonly idempotency: IdempotencyService,
    private readonly mediator: WagerMediator,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    private readonly journey: JourneyService,
  ) {}

  async open(input: WalletOpeningInput): Promise<Wallet> {
    const startedAt = this.clock.now()
    const zero = MoneyValue.zero(input.initialBalance.currency)
    const start = input.initialBalance.isZero() ? input.initialBalance : zero
    const walletInput = {
      id: input.id,
      playerId: input.playerId,
      balance: start,
      openedAt: input.openedAt,
    }
    const wallet = Wallet.open(walletInput)
    const flowId = `${openingPrefix}${separator}${wallet.id}`

    const run = async () => {
      await this.orm.em.transactional(async (manager) => {
        const wallets = new WalletRepository(manager)
        const wagers = new WagerTransactionRepository(manager)
        const ledger = new WalletLedgerRepository(manager)
        const found = await wallets.findByPlayerAndCurrency(input.playerId, input.initialBalance.currency)

        if (found !== undefined) {
          throw new Error(WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE)
        }

        await wallets.save(wallet)

        const funded = input.initialBalance.isPositive()

        if (!funded) { return }

        const opening = this.opening(wallet, input)
        const ledgerId = uuidv7()
        const mediation = {
          wallet,
          reference: undefined,
          reversed: false,
          ledgerId,
          at: input.openedAt,
        }
        const row = this.mediator.mediate(opening, mediation)

        await WalletOpeningWriter.persist(wallets, wagers, ledger, wallet, opening, row)
      })
    }

    try {
      await run()

      this.track(flowId, input.playerId, input.id, startedAt, JourneyOutcome.SUCCEEDED)

      return wallet
    } catch (error) {
      this.track(flowId, input.playerId, input.id, startedAt, JourneyOutcome.ROLLBACK)

      throw error
    }
  }

  private track(
    flowId: string,
    playerId: string,
    walletId: string,
    startedAt: Date,
    outcome: JourneyOutcome,
  ): void {
    void this.journey.record({
      flowId,
      stage: JourneyStage.DATABASE,
      operation: operation,
      outcome,
      startedAt,
      providerId: platformProvider,
      playerId,
      wagerId: undefined,
      walletId,
      failureCode: undefined,
    })
  }

  private opening(wallet: Wallet, input: WalletOpeningInput): WagerTransaction {
    const externalTransactionId = `opening:${wallet.id}`
    const idempotencyKey = `opening:${wallet.id}`
    const wagerId = uuidv7()
    const payload = {
      providerId: scope.provider,
      externalTransactionId,
      playerId: input.playerId,
      walletId: wallet.id,
      roundId: wallet.id,
      gameId: scope.game,
      kind: WagerTransactionKind.OPENING,
      money: input.initialBalance,
      referenceExternalTransactionId: undefined,
    }
    const payloadHash = this.idempotency.hash(payload)
    const wagerInput = {
      id: wagerId,
      providerId: scope.provider,
      externalTransactionId,
      idempotencyKey,
      payloadHash,
      walletId: wallet.id,
      playerId: input.playerId,
      roundId: wallet.id,
      gameId: scope.game,
      kind: WagerTransactionKind.OPENING,
      money: input.initialBalance,
      referenceExternalTransactionId: undefined,
      createdAt: input.openedAt,
    }

    return WagerTransaction.create(wagerInput)
  }

  private static async persist(
    wallets: WalletRepository,
    wagers: WagerTransactionRepository,
    ledger: WalletLedgerRepository,
    wallet: Wallet,
    opening: WagerTransaction,
    row: Ledger | undefined,
  ): Promise<void> {
    await wallets.save(wallet)
    await wagers.save(opening)

    if (row === undefined) { return }

    await ledger.save(row)
  }
}
