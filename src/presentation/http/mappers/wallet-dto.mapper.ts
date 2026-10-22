import { BadRequestException } from '@nestjs/common'
import type { MapperProtocol } from '../../../application/protocols'
import { Money } from '../../../domain/money/money'
import type { WalletDto } from '../dtos'
import { INVALID_WALLET_BODY_MESSAGE } from '../data'
import type { HttpType } from '../types'

type Input = WalletDto
type Output = HttpType.WalletInput

export class WalletDtoMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const initialBalance = this.parseMoney(input.initialBalance)

    return { playerId: input.playerId, initialBalance }
  }

  private readonly parseMoney = (value: { amount: string; currency: string }): Money => {
    try {
      return Money.from(value)
    } catch {
      throw new BadRequestException(INVALID_WALLET_BODY_MESSAGE)
    }
  }
}