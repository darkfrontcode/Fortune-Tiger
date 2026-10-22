import { BadRequestException } from '@nestjs/common'
import { Money } from '../../domain/money/money'
import { WagerTransactionKind } from '../../domain/wager/enums'
import { INVALID_WAGER_BODY_MESSAGE } from './data'
import type { HttpType } from './types'

type Input = unknown
type Output = HttpType.WagerInput

const kinds = Object.values(WagerTransactionKind)

export class WagerBody {
  read(input: Input): Output {
    const source = this.object(input)
    const kind = this.kind(source.kind)
    const reference = this.reference(source.referenceExternalTransactionId)

    this.referenced(kind, reference)

    return {
      providerId: this.text(source.providerId),
      externalTransactionId: this.text(source.externalTransactionId),
      playerId: this.text(source.playerId),
      walletId: this.text(source.walletId),
      roundId: this.text(source.roundId),
      gameId: this.text(source.gameId),
      kind,
      money: this.money(source.money),
      referenceExternalTransactionId: reference,
    }
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

  private readonly kind = (value: unknown): WagerTransactionKind => {
    const text = this.text(value)
    const found = kinds.includes(text as WagerTransactionKind)

    if (!found) { return this.fail() }

    return text as WagerTransactionKind
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

  private readonly reference = (value: unknown): string | undefined => {
    const absent = value === undefined

    if (absent) { return undefined }

    return this.text(value)
  }

  private readonly referenced = (kind: WagerTransactionKind, reference: string | undefined): void => {
    const reversal = kind === WagerTransactionKind.REFUND || kind === WagerTransactionKind.ROLLBACK
    const missing = reversal && reference === undefined

    if (missing) { this.fail() }
  }

  private readonly fail = (): never => {
    throw new BadRequestException(INVALID_WAGER_BODY_MESSAGE)
  }
}
