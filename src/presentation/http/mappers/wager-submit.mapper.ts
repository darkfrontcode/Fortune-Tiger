import type { WagersType } from '@application/wagers'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = {
  output: WagersType.SubmitOutput
  currency: string
}

type Output = HttpType.WagerSubmitOutput

export class WagerSubmitMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const { output, currency } = input
    const balance = { amount: output.balance, currency }

    return {
      transactionId: output.transactionId,
      status: output.status,
      balance,
      idempotentReplay: output.idempotentReplay,
      failureCode: output.failureCode,
    }
  }
}
