import { BadRequestException } from '@nestjs/common'
import { Money } from '@domain/money/money'
import { WagerTransactionKind } from '@domain/wager/enums'
import type { WagerDto } from '../dtos'
import { INVALID_WAGER_BODY_MESSAGE } from '../data'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = WagerDto
type Output = HttpType.WagerInput

export class WagerDtoMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const kind = input.kind as WagerTransactionKind

    this.assertReference(kind, input.referenceExternalTransactionId)

    const money = this.parseMoney(input.money)

    return {
      providerId: input.providerId,
      externalTransactionId: input.externalTransactionId,
      playerId: input.playerId,
      walletId: input.walletId,
      roundId: input.roundId,
      gameId: input.gameId,
      kind,
      money,
      referenceExternalTransactionId: input.referenceExternalTransactionId,
    }
  }

  private readonly parseMoney = (value: { amount: string; currency: string }): Money => {
    try {
      return Money.from(value)
    } catch {
      throw new BadRequestException(INVALID_WAGER_BODY_MESSAGE)
    }
  }

  private readonly assertReference = (kind: WagerTransactionKind, reference: string | undefined): void => {
    const reversal = kind === WagerTransactionKind.REFUND || kind === WagerTransactionKind.ROLLBACK
    const missing = reversal && reference === undefined

    if (missing) { throw new BadRequestException(INVALID_WAGER_BODY_MESSAGE) }
  }
}
