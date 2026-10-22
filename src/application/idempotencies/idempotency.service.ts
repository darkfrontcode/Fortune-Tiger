import { Injectable } from '@nestjs/common'
import { FailureCode } from '../../domain/wager/enums'
import { IdempotencyOutcome } from './enums'
import { IdempotencyHashGuard } from './guards'
import { IdempotencyReplay } from './idempotency.replay'
import { PayloadHashPattern } from './patterns'
import { IdempotencyType } from './types'

type Payload = IdempotencyType.Payload
type Input = IdempotencyType.Input
type Output = IdempotencyType.Output

@Injectable()
export class IdempotencyService {
  private readonly hashGuard = new IdempotencyHashGuard()

  hash(payload: Payload): string {
    return new PayloadHashPattern().test(payload)
  }

  outcome(input: Input): Output {
    const stored = input.stored

    if (stored === undefined) {
      const outcome = IdempotencyOutcome.FRESH
      return { outcome }
    }

    const storedHash = stored.wager.payloadHash
    const incoming = input.hash
    const hashInput = { stored: storedHash, incoming }

    const same = this.hashGuard.guard(hashInput)

    if (!same) {
      const outcome = IdempotencyOutcome.CONFLICT
      const failureCode = FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT

      return { outcome, failureCode }
    }

    return IdempotencyReplay.from(stored)
  }
}
