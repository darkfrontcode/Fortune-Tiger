import { describe, expect, test } from 'bun:test'
import type { ClockProtocol } from '@application/time'
import type { WalletOpeningInput, WalletOpeningProtocol } from '@application/wallets'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { OpenWalletUseCase } from '../open-wallet.use-case'

describe('OpenWalletUseCase', () => {
  test('opens a wallet with the current time', async () => {
    const openedAt = new Date('2025-01-01T00:00:00.000Z')
    const playerId = 'player-1'
    const initialBalance = Money.from({ amount: '10.00', currency: 'USD' })
    const wallet = Wallet.open({
      id: 'wallet-1',
      playerId,
      balance: initialBalance,
      openedAt,
    })
    const calls: Array<WalletOpeningInput> = []
    const opening: WalletOpeningProtocol = {
      open: async (input) => {
        calls.push(input)

        return wallet
      },
    }
    const clock: ClockProtocol = {
      now: () => openedAt,
    }
    const useCase = new OpenWalletUseCase(opening, clock)
    const input = { playerId, initialBalance }
    const result = await useCase.execute(input)

    expect(result).toBe(wallet)
    expect(calls).toEqual([{ playerId, initialBalance, openedAt }])
  })
})
