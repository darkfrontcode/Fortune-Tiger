import { describe, expect, test } from 'bun:test'
import { Money } from '../../../../domain/money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '../../../../domain/wager/enums'
import type { WagerTransaction } from '../../../../domain/wager/wager'
import { IdempotencyService } from '../../../idempotencies/idempotency.service'
import type { WagerGatewayProtocol } from '../../../protocols'
import { TransactionsType } from '../types'
import { WagerService } from '../wager.service'

type SubmitInput = TransactionsType.SubmitInput
type SubmitOutput = TransactionsType.SubmitOutput

class Gateway implements WagerGatewayProtocol {
  readonly calls: WagerTransaction[] = []

  readonly output: SubmitOutput = {
    transactionId: 'gateway-tx',
    status: WagerTransactionStatus.PROCESSED,
    balance: '10.00',
    idempotentReplay: false,
    failureCode: undefined,
  }

  submit(wager: WagerTransaction, _at: Date): Promise<SubmitOutput> {
    this.calls.push(wager)

    return Promise.resolve(this.output)
  }
}

const instant = new Date('2026-01-01T00:00:00.000Z')

const money = Money.from({ amount: '10.00', currency: 'BRL' })

const base = (): SubmitInput => ({
  id: 'tx-1',
  idempotencyKey: 'provider:ext-1',
  providerId: 'provider',
  externalTransactionId: 'ext-1',
  playerId: 'player-1',
  walletId: 'wallet-1',
  roundId: 'round-1',
  gameId: 'fortune-tiger',
  kind: WagerTransactionKind.BET,
  money,
  referenceExternalTransactionId: undefined,
  at: instant,
})

describe('WagerService', () => {
  test('opening - WHEN kind is OPENING SHOULD reject without calling the gateway', async () => {
    const gateway = new Gateway()
    const service = new WagerService(gateway, new IdempotencyService())
    const input = base()
    const opening = { ...input, kind: WagerTransactionKind.OPENING }
    const output = await service.submit(opening)

    expect(gateway.calls).toHaveLength(0)
    expect(output.status).toBe(WagerTransactionStatus.REJECTED)
    expect(output.failureCode).toBe(FailureCode.OPENING_NOT_ALLOWED)
    expect(output.idempotentReplay).toBe(false)
  })

  test('bet - WHEN kind is BET SHOULD hash the payload and call the gateway', async () => {
    const gateway = new Gateway()
    const service = new WagerService(gateway, new IdempotencyService())
    const input = base()
    const output = await service.submit(input)

    expect(gateway.calls).toHaveLength(1)
    expect(gateway.calls[0]?.payloadHash).toHaveLength(64)
    expect(output).toEqual(gateway.output)
  })
})
