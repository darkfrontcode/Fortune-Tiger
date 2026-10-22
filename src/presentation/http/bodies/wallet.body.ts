import { BadRequestException } from '@nestjs/common'
import { Money } from '../../../domain/money/money'
import { INVALID_WALLET_BODY_MESSAGE } from '../data'
import type { HttpType } from '../types'

type Input = unknown
type Output = HttpType.WalletInput

export class WalletBody {
  read(input: Input): Output {
    const source = this.object(input)
    const playerId = this.text(source.playerId)
    const initialBalance = this.money(source.initialBalance)

    return { playerId, initialBalance }
  }

  private readonly object = (value: unknown): Record<string, unknown> => {
    const valid = typeof value === 'object' && value !== null && !Array.isArray(value)

    if (!valid) { return this.fail() }

    return value as Record<string, unknown>
  }

  private readonly text = (value: unknown): string => {
    const valid = typeof value === 'string' && value.length > 0

    if (!valid) { return this.fail() }

    return value
  }

  private readonly money = (value: unknown): Money => {
    const source = this.object(value)
    const amount = this.text(source.amount)
    const currency = this.text(source.currency)

    try {
      return Money.from({ amount, currency })
    } catch {
      return this.fail()
    }
  }

  private readonly fail = (): never => {
    throw new BadRequestException(INVALID_WALLET_BODY_MESSAGE)
  }
}