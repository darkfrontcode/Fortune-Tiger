import { Inject, Injectable } from '@nestjs/common'
import type { WagerReaderProtocol } from '../protocols'
import type { WagerTransaction } from '@domain/wager/wager'
import { WAGER_READER } from '../tokens'
import { WagerNotFoundError } from '../errors'

type Input = {
  transactionId: string
}

type Output = Promise<WagerTransaction>

@Injectable()
export class FindWagerUseCase {
  constructor(@Inject(WAGER_READER) private readonly wagerReader: WagerReaderProtocol) {}

  async execute(input: Input): Output {
    const { transactionId } = input
    const wager = await this.wagerReader.findById(transactionId)
    const missing = wager === undefined

    if (missing) { throw new WagerNotFoundError() }

    return wager
  }
}
