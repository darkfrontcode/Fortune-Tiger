import { Injectable } from '@nestjs/common'
import { WagerTransactionKind } from '@domain/wager'
import { MISSING_STRATEGY_MESSAGE } from '../data'
import type { WagerStrategyProtocol } from '../protocols'
import { WagerMovesService } from '../services'
import {
  BetOption,
  LossOption,
  OpeningOption,
  RefundOption,
  RollbackOption,
  WinOption,
} from './options'

@Injectable()
export class WagerStrategy {
  private readonly strategies: Map<WagerTransactionKind, WagerStrategyProtocol>

  constructor(moves: WagerMovesService = new WagerMovesService()) {
    this.strategies = new Map<WagerTransactionKind, WagerStrategyProtocol>([
      [WagerTransactionKind.OPENING, new OpeningOption(moves)],
      [WagerTransactionKind.BET, new BetOption(moves)],
      [WagerTransactionKind.WIN, new WinOption(moves)],
      [WagerTransactionKind.LOSS, new LossOption()],
      [WagerTransactionKind.REFUND, new RefundOption(moves)],
      [WagerTransactionKind.ROLLBACK, new RollbackOption(moves)],
    ])
  }

  from(kind: WagerTransactionKind): WagerStrategyProtocol {
    const strategy = this.strategies.get(kind)

    if (strategy !== undefined) { return strategy }

    const message = MISSING_STRATEGY_MESSAGE

    throw new Error(message)
  }
}
