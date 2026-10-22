import { describe, expect, test } from 'bun:test'
import { WagerTransactionStatus } from '@domain/wager/enums'
import type { ReferenceGatewayProtocol, ReferenceReaderProtocol } from '../../../protocols'
import { ReferenceType } from '../../types'
import { RetryReferencesUseCase } from '../retry-references.use-case'

type DueInput = {
  at: Date
  limit: number
}

type RetryOutput = ReferenceType.RetryOutput

class Reader implements ReferenceReaderProtocol {
  readonly calls: Array<DueInput> = []

  constructor(private readonly ids: Array<string>) {}

  due(at: Date, limit: number): Promise<Array<string>> {
    this.calls.push({ at, limit })

    return Promise.resolve(this.ids)
  }
}

class Gateway implements ReferenceGatewayProtocol {
  readonly calls: Array<string> = []

  constructor(private readonly statuses: Map<string, WagerTransactionStatus | undefined>) {}

  retry(transactionId: string, _at: Date): Promise<RetryOutput | undefined> {
    this.calls.push(transactionId)

    const status = this.statuses.get(transactionId)

    if (status === undefined) { return Promise.resolve(undefined) }

    return Promise.resolve({ transactionId, status })
  }
}

const instant = {
  at: new Date('2026-01-01T00:00:00.000Z'),
}

const limit = 20

const identity = {
  processed: 'processed-id',
  waiting: 'waiting-id',
  rejected: 'rejected-id',
  skipped: 'skipped-id',
}

describe('RetryReferencesUseCase', () => {
  test('WHEN due wagers exist SHOULD retry them in order and report the statuses', async () => {
    const ids = [identity.processed, identity.waiting, identity.rejected]
    const statuses = new Map<string, WagerTransactionStatus | undefined>([
      [identity.processed, WagerTransactionStatus.PROCESSED],
      [identity.waiting, WagerTransactionStatus.PENDING_REFERENCE],
      [identity.rejected, WagerTransactionStatus.REJECTED],
    ])
    const reader = new Reader(ids)
    const gateway = new Gateway(statuses)
    const useCase = new RetryReferencesUseCase(reader, gateway)
    const output = await useCase.execute({ at: instant.at, limit })

    expect(gateway.calls).toEqual(ids)
    expect(reader.calls).toEqual([{ at: instant.at, limit }])
    expect(output).toEqual({ checked: 3, processed: 1, rejected: 1, waiting: 1 })
  })

  test('WHEN a retry returns nothing SHOULD keep it out of the counts', async () => {
    const ids = [identity.processed, identity.skipped]
    const statuses = new Map<string, WagerTransactionStatus | undefined>([
      [identity.processed, WagerTransactionStatus.PROCESSED],
      [identity.skipped, undefined],
    ])
    const reader = new Reader(ids)
    const gateway = new Gateway(statuses)
    const useCase = new RetryReferencesUseCase(reader, gateway)
    const output = await useCase.execute({ at: instant.at, limit })

    expect(gateway.calls).toEqual(ids)
    expect(output).toEqual({ checked: 2, processed: 1, rejected: 0, waiting: 0 })
  })

  test('WHEN nothing is due SHOULD return an empty report', async () => {
    const reader = new Reader([])
    const gateway = new Gateway(new Map())
    const useCase = new RetryReferencesUseCase(reader, gateway)
    const output = await useCase.execute({ at: instant.at, limit })

    expect(gateway.calls).toEqual([])
    expect(output).toEqual({ checked: 0, processed: 0, rejected: 0, waiting: 0 })
  })
})
