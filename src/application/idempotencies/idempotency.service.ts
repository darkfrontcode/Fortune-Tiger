import { FailureCode } from '../../domain/wager/enums'
import { IdempotencyOutcome } from './enums'
import { IdempotencyGuard } from './idempotency.guard'
import { IdempotencyReplay } from './idempotency.replay'
import { PayloadHashPattern } from './patterns'
import { IdempotencyType } from './types'

type Payload = IdempotencyType.Payload
type Input = IdempotencyType.Input
type Output = IdempotencyType.Output

export class IdempotencyService {
  hash(payload: Payload): string {
    return new PayloadHashPattern().test(payload)
  }

  outcome(input: Input): Output {
    const stored = input.stored

    if (stored === undefined) {
      const outcome = IdempotencyOutcome.FRESH
      return { outcome }
    }

    const same = IdempotencyGuard.same(stored.wager.payloadHash, input.hash)

    if (!same) {
      const outcome = IdempotencyOutcome.CONFLICT
      const failureCode = FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT

      return { outcome, failureCode }
    }

    return IdempotencyReplay.from(stored)
  }
}
