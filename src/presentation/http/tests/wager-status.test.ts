import { describe, expect, test } from 'bun:test'
import { HttpStatus } from '@nestjs/common'
import { Theory } from '@infrastructure/protocols'
import type { WagersType } from '@application/wagers'
import { FailureCode, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerStatus } from '../statuses'

interface WagerStatusTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

type Output = WagersType.SubmitOutput
type Params = { value: Output; code: HttpStatus }

const status = new WagerStatus()

const balance = '90.00'

const output = (value: Partial<Output>): Output => {
  return {
    transactionId: 'wager-1',
    status: WagerTransactionStatus.PROCESSED,
    balance,
    idempotentReplay: false,
    failureCode: undefined,
    ...value,
  }
}

describe('WagerStatus', () => {
  describe('of', () => {
    const theories: WagerStatusTheory<Params>[] = [
      {
        title: 'pending',
        description: 'WHEN the wager is pending SHOULD answer 202',
        params: { value: output({ status: WagerTransactionStatus.PENDING }), code: HttpStatus.ACCEPTED },
        expected: true,
      },
      {
        title: 'pending reference',
        description: 'WHEN the wager waits for a reference SHOULD answer 202',
        params: { value: output({ status: WagerTransactionStatus.PENDING_REFERENCE }), code: HttpStatus.ACCEPTED },
        expected: true,
      },
      {
        title: 'processed',
        description: 'WHEN the wager is processed SHOULD answer 200',
        params: { value: output({ status: WagerTransactionStatus.PROCESSED }), code: HttpStatus.OK },
        expected: true,
      },
      {
        title: 'rejected',
        description: 'WHEN the wager is rejected SHOULD answer 422',
        params: {
          value: output({
            status: WagerTransactionStatus.REJECTED,
            failureCode: FailureCode.INSUFFICIENT_FUNDS,
          }),
          code: HttpStatus.UNPROCESSABLE_ENTITY,
        },
        expected: true,
      },
      {
        title: 'failed',
        description: 'WHEN the wager failed on infrastructure SHOULD answer 503',
        params: { value: output({ status: WagerTransactionStatus.FAILED }), code: HttpStatus.SERVICE_UNAVAILABLE },
        expected: true,
      },
      {
        title: 'replayed rejection',
        description: 'WHEN the wager is a replay SHOULD answer 200 even when rejected',
        params: {
          value: output({
            status: WagerTransactionStatus.REJECTED,
            failureCode: FailureCode.INSUFFICIENT_FUNDS,
            idempotentReplay: true,
          }),
          code: HttpStatus.OK,
        },
        expected: true,
      },
      {
        title: 'idempotency conflict',
        description: 'WHEN the idempotency key repeats with a different payload SHOULD answer 409',
        params: {
          value: output({
            status: WagerTransactionStatus.PROCESSED,
            failureCode: FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT,
          }),
          code: HttpStatus.CONFLICT,
        },
        expected: true,
      },
    ]

    const prove = ({ params }: WagerStatusTheory<Params>) => {
      const code = status.of(params.value)
      const aligned = code === params.code

      expect(aligned).toBe(true)
    }

    test.each(theories)('$title - $description', prove)
  })
})
