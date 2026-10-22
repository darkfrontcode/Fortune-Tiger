import { describe, expect, test } from 'bun:test'
import type { WagerReaderProtocol } from '../../protocols'
import { Money } from '@domain/money/money'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { FindWagerByProviderUseCase } from '../find-wager-by-provider.use-case'
import { FindWagerUseCase } from '../find-wager.use-case'
import { WagerNotFoundError } from '../wager-not-found.error'

const identity = {
  transaction: 'transaction-1',
  provider: 'provider-1',
  external: 'external-1',
}

const createdAt = new Date('2026-01-01T00:00:00.000Z')
const money = Money.from({ amount: '10.00', currency: 'BRL' })
const wager = WagerTransaction.create({
  id: identity.transaction,
  providerId: identity.provider,
  externalTransactionId: identity.external,
  idempotencyKey: 'provider-1:external-1',
  payloadHash: 'payload-hash',
  walletId: 'wallet-1',
  playerId: 'player-1',
  roundId: 'round-1',
  gameId: 'fortune-tiger',
  kind: WagerTransactionKind.BET,
  money,
  referenceExternalTransactionId: undefined,
  createdAt,
})

const reader: WagerReaderProtocol = {
  findById: async (transactionId) => transactionId === identity.transaction ? wager : undefined,
  findByProviderAndExternal: async (providerId, externalTransactionId) => {
    const found = providerId === identity.provider && externalTransactionId === identity.external

    if (found) { return wager }

    return undefined
  },
}

describe('Wager lookup use cases', () => {
  test('finds a transaction by its ID', async () => {
    const useCase = new FindWagerUseCase(reader)
    const input = { transactionId: identity.transaction }
    const output = await useCase.execute(input)

    expect(output).toBe(wager)
  })

  test('finds a transaction by its provider pair', async () => {
    const useCase = new FindWagerByProviderUseCase(reader)
    const input = { providerId: identity.provider, externalTransactionId: identity.external }
    const output = await useCase.execute(input)

    expect(output).toBe(wager)
  })

  test('throws when a transaction ID is absent', async () => {
    const useCase = new FindWagerUseCase(reader)
    const input = { transactionId: 'missing' }
    const output = useCase.execute(input)

    await expect(output).rejects.toBeInstanceOf(WagerNotFoundError)
  })

  test('throws when a provider pair is absent', async () => {
    const useCase = new FindWagerByProviderUseCase(reader)
    const input = { providerId: 'missing', externalTransactionId: identity.external }
    const output = useCase.execute(input)

    await expect(output).rejects.toBeInstanceOf(WagerNotFoundError)
  })
})
