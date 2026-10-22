
import { STATUS_TRANSITION_MESSAGE, TERMINAL_STATUS_MESSAGE } from '../data'
import { TransitionMap } from '../maps'
import type { WagerType } from '../types'
import { WagerTerminalGuard } from './wager-terminal.guard'

type Input = WagerType.Transition
type Output = void

export class WagerTransitionGuard {
  private readonly terminal = new WagerTerminalGuard()
  private readonly transitions = new TransitionMap()

  guard(input: Input): Output {
    const { status, target } = input

    const closed = this.terminal.guard(status)

    if (closed) {
      const message = TERMINAL_STATUS_MESSAGE

      throw new Error(message)
    }

    const targets = this.transitions.get(status)
    const allowed = targets.includes(target)

    if (allowed) { return }

    const message = STATUS_TRANSITION_MESSAGE

    throw new Error(message)
  }
}
