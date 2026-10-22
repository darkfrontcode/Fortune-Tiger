import { describe, expect, test } from 'bun:test'
import type { LedgerReaderProtocol, WalletReaderProtocol } from '@application/wallets'
import type { LedgerPage } from '@application/wallets'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WalletNotFoundError } from '../../wallet-not-found.error'
import { ListWalletLedgerUseCase } from '../list-wallet-ledger.use-case'

const walletId = 'wallet-1'
const playerId = 'player-1'
const openedAt = new Date('2025-01-01T00:00:00.000Z')
const balance = Money.from({ amount: '10.00', currency: 'USD' })
const wallet = Wallet.open({ id: walletId, playerId, balance, openedAt })

describe('ListWalletLedgerUseCase', () => {
  test('checks the wallet before reading its ledger page', async () => {
    const page: LedgerPage = { items: [], nextCursor: undefined }
    const walletReader: WalletReaderProtocol = {
      findById: async () => wallet,
    }
    const ledgerReader: LedgerReaderProtocol = {
      page: async () => page,
    }
    const useCase = new ListWalletLedgerUseCase(walletReader, ledgerReader)
    const input = { walletId, cursor: undefined, limit: 20 }
    const result = await useCase.execute(input)

    expect(result).toBe(page)
  })

  test('does not read a ledger page for a missing wallet', async () => {
    const reads: Array<boolean> = []
    const walletReader: WalletReaderProtocol = {
      findById: async () => undefined,
    }
    const ledgerReader: LedgerReaderProtocol = {
      page: async () => {
        reads.push(true)

        return { items: [], nextCursor: undefined }
      },
    }
    const useCase = new ListWalletLedgerUseCase(walletReader, ledgerReader)
    const input = { walletId, cursor: undefined, limit: 20 }
    const result = useCase.execute(input)

    await expect(result).rejects.toBeInstanceOf(WalletNotFoundError)
    expect(reads).toHaveLength(0)
  })
})
