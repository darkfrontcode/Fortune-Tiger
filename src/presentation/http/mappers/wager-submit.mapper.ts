import type { MapperProtocol } from '../../../application/protocols'
import type { TransactionsType } from '../../../application/transactions'
import type { HttpType } from '../types'

type Input = {
  output: TransactionsType.SubmitOutput
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
