import { describe, expect, test } from 'bun:test'
import type { WalletReaderProtocol } from '@application/wallets'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WalletNotFoundError } from '../../wallet-not-found.error'
import { FindWalletUseCase } from '../find-wallet.use-case'

const identity = {
  wallet: 'wallet-id',
  player: 'player-id',
}

const amount = '25.00'
const currency = 'BRL'
const instant = new Date('2026-01-01T00:00:00.000Z')
const balance = Money.from({ amount, currency })
const walletInput = {
  id: identity.wallet,
  playerId: identity.player,
  balance,
  openedAt: instant,
}
const wallet = Wallet.open(walletInput)
const walletReader: WalletReaderProtocol = {
  findById: async (walletId) => {
    const found = walletId === wallet.id

    if (found) { return wallet }

    return undefined
  },
}
const missingWalletReader: WalletReaderProtocol = {
  findById: async () => undefined,
}

describe('FindWalletUseCase', () => {
  test('found - WHEN the wallet exists SHOULD return it', async () => {
    const useCase = new FindWalletUseCase(walletReader)
    const input = { walletId: identity.wallet }
    const output = await useCase.execute(input)

    expect(output).toBe(wallet)
  })

  test('missing - WHEN the wallet is absent SHOULD throw WalletNotFoundError', async () => {
    const useCase = new FindWalletUseCase(missingWalletReader)
    const input = { walletId: identity.wallet }
    const output = useCase.execute(input)

    await expect(output).rejects.toBeInstanceOf(WalletNotFoundError)
  })
})
