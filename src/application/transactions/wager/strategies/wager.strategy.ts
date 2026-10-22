import { WagerTransactionKind } from '@domain/wager'
import { MISSING_STRATEGY_MESSAGE } from '../data'
import type { WagerStrategyProtocol } from '../../../protocols'
import { BetStrategy } from './bet.strategy'
import { LossStrategy } from './loss.strategy'
import { OpeningStrategy } from './opening.strategy'
import { RefundStrategy } from './refund.strategy'
import { RollbackStrategy } from './rollback.strategy'
import { WinStrategy } from './win.strategy'

export class WagerStrategy {
  static from(kind: WagerTransactionKind): WagerStrategyProtocol {
    if (kind === WagerTransactionKind.OPENING) { return new OpeningStrategy() }
    if (kind === WagerTransactionKind.BET) { return new BetStrategy() }
    if (kind === WagerTransactionKind.WIN) { return new WinStrategy() }
    if (kind === WagerTransactionKind.LOSS) { return new LossStrategy() }
    if (kind === WagerTransactionKind.REFUND) { return new RefundStrategy() }
    if (kind === WagerTransactionKind.ROLLBACK) { return new RollbackStrategy() }

    const message = MISSING_STRATEGY_MESSAGE

    throw new Error(message)
  }
}
