import { BadRequestException } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import { Money } from '@domain/money/money'
import type { WalletDto } from '../dtos'
import { INVALID_WALLET_BODY_MESSAGE } from '../data'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = WalletDto
type Output = HttpType.WalletInput

export class WalletDtoMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const initialBalance = this.parseMoney(input.initialBalance)

    return { id: uuidv7(), playerId: input.playerId, initialBalance }
  }

  private readonly parseMoney = (value: { amount: string; currency: string }): Money => {
    try {
      return Money.from(value)
    } catch {
      throw new BadRequestException(INVALID_WALLET_BODY_MESSAGE)
    }
  }
}