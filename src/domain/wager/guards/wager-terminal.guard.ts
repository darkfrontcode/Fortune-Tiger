import type { GuardProtocol } from '@application/protocols'
import { WagerTransactionStatus } from '../enums'
import { TransitionMap } from '../maps'

type Input = WagerTransactionStatus
type Output = boolean

const none = 0

export class WagerTerminalGuard implements GuardProtocol<Input, Output> {
  private readonly transitions = new TransitionMap()

  guard(input: Input): Output {
    const targets = this.transitions.get(input)
    const empty = targets.length === none

    return empty
  }
}
