import { Inject, Injectable } from '@nestjs/common'
import { WagerTransactionStatus } from '@domain/wager/enums'
import type { ReferenceGatewayProtocol, ReferenceReaderProtocol } from '../protocols'
import { REFERENCE_GATEWAY, REFERENCE_READER } from './tokens'
import { ReferenceType } from './types'

type Input = ReferenceType.Input
type Output = ReferenceType.Output
type RetryOutput = ReferenceType.RetryOutput

@Injectable()
export class ReferenceService {
  constructor(
    @Inject(REFERENCE_READER) private readonly reader: ReferenceReaderProtocol,
    @Inject(REFERENCE_GATEWAY) private readonly gateway: ReferenceGatewayProtocol,
  ) {}

  async retry(input: Input): Promise<Output> {
    const { at, limit } = input
    const due = await this.reader.due(at, limit)

    const toRetried = async (chain: Promise<Array<RetryOutput>>, transactionId: string) => {
      const outputs = await chain
      const output = await this.gateway.retry(transactionId, at)

      if (output === undefined) { return outputs }

      return outputs.concat(output)
    }

    const started = Promise.resolve(new Array<RetryOutput>())
    const outputs = await due.reduce(toRetried, started)

    const byProcessed = (output: RetryOutput) => output.status === WagerTransactionStatus.PROCESSED
    const byRejected = (output: RetryOutput) => output.status === WagerTransactionStatus.REJECTED
    const byWaiting = (output: RetryOutput) => output.status === WagerTransactionStatus.PENDING_REFERENCE

    const processed = outputs.filter(byProcessed).length
    const rejected = outputs.filter(byRejected).length
    const waiting = outputs.filter(byWaiting).length

    const checked = due.length

    return { checked, processed, rejected, waiting }
  }
}
