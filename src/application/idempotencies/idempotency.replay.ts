import { IdempotencyOutcome } from './enums'
import { IdempotencyType } from './types'

type Replay = IdempotencyType.Replay
type Stored = IdempotencyType.Stored

export class IdempotencyReplay {
  static from(stored: Stored): Replay {
    const wager = stored.wager

    return {
      outcome: IdempotencyOutcome.REPLAY,
      idempotentReplay: true,
      transactionId: wager.id,
      status: wager.status,
      balance: stored.observedBalance,
      failureCode: wager.failureCode,
    }
  }
}
