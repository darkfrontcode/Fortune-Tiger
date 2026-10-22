
import type { IdempotencyType } from '../types'

type Input = IdempotencyType.Hash
type Output = boolean

export class IdempotencyHashGuard {
  guard(input: Input): Output {
    const { stored, incoming } = input

    const same = stored === incoming

    return same
  }
}
