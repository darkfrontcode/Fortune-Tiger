import type { GuardProtocol } from '@application/protocols'
import { REFERENCE_REQUIRED_MESSAGE } from '../data'
import type { WagerType } from '../types'
import { WagerReversalGuard } from './wager-reversal.guard'

type Input = WagerType.Reference
type Output = void

export class WagerReferenceGuard implements GuardProtocol<Input, Output> {
  private readonly reversal = new WagerReversalGuard()

  guard(input: Input): Output {
    const { kind, reference } = input

    const required = this.reversal.guard(kind)
    const empty = reference === String()
    const missing = required && empty
    const message = REFERENCE_REQUIRED_MESSAGE

    if (missing) { throw new Error(message) }
  }
}
