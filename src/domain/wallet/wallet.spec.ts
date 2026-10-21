import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../application/protocols'
import { Money } from '../money/money'
import { Wallet } from './wallet'

interface WalletTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  zero: '0.00',
  ten: '10.00',
  twenty: '20.00',
  thirty: '30.00',
  eighty: '80.00',
  hundred: '100.00',
}

const identity = {
  wallet: 'wallet-id',
  player: 'player-id',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  move: new Date('2026-01-01T00:00:01.000Z'),
  again: new Date('2026-01-01T00:00:02.000Z'),
}

const revision = {
  open: 1,
  moved: 2,
  stored: 4,
}

class WalletProbe {
  static failed(read: () => void): boolean {
    try {
      read()
      return false
    } catch {
      return true
    }
  }

  static open(value: string, code: string): Wallet {
    const balance = Money.from({ amount: value, currency: code })
    const input = {
      id: identity.wallet,
      playerId: identity.player,
      balance,
      openedAt: instant.open,
    }

    return Wallet.open(input)
  }
}

describe('Wallet', () => {
  describe('open', () => {
    type Params = { amount: string; currency: string }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'one hundred reais',
        description: 'WHEN the wallet opens SHOULD start version at 1',
        params: { amount: amount.hundred, currency: currency.brl },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(params.amount, params.currency)
      const opened = wallet.version === revision.open
      const sameInstant = wallet.createdAt.getTime() === wallet.updatedAt.getTime()
      const kept = opened && sameInstant && wallet.balance.amount === params.amount

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('open with a negative balance', () => {
    type Params = { amount: string; currency: string }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'negated ten',
        description: 'WHEN the opening balance is negative SHOULD throw',
        params: { amount: amount.ten, currency: currency.brl },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const positive = Money.from({ amount: params.amount, currency: params.currency })
      const balance = positive.negate()
      const input = {
        id: identity.wallet,
        playerId: identity.player,
        balance,
        openedAt: instant.open,
      }
      const read = () => Wallet.open(input)
      const refused = WalletProbe.failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit', () => {
    type Params = { opening: string; stake: string; left: string; version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'eighty from one hundred',
        description: 'WHEN 100.00 debits 80.00 SHOULD leave 20.00 and version 2',
        params: {
          opening: amount.hundred,
          stake: amount.eighty,
          left: amount.twenty,
          version: revision.moved,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(params.opening, currency.brl)
      const stake = Money.from({ amount: params.stake, currency: currency.brl })

      wallet.debit(stake, instant.move)

      const left = wallet.balance.amount === params.left
      const moved = wallet.version === params.version
      const stamped = wallet.updatedAt.getTime() === instant.move.getTime()
      const kept = left && moved && stamped

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('second debit', () => {
    type Params = { left: string; version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'eighty again',
        description: 'WHEN the second 80.00 debit would pass below zero SHOULD throw and keep 20.00',
        params: { left: amount.twenty, version: revision.moved },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(amount.hundred, currency.brl)
      const stake = Money.from({ amount: amount.eighty, currency: currency.brl })

      wallet.debit(stake, instant.move)

      const read = () => wallet.debit(stake, instant.again)
      const refused = WalletProbe.failed(read)
      const left = wallet.balance.amount === params.left
      const moved = wallet.version === params.version
      const kept = refused && left && moved

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit of zero', () => {
    type Params = { version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'zero reais',
        description: 'WHEN the debit is zero SHOULD keep version at 1',
        params: { version: revision.open },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(amount.hundred, currency.brl)
      const stake = Money.from({ amount: amount.zero, currency: currency.brl })

      wallet.debit(stake, instant.move)

      const kept = wallet.version === params.version
      const stamped = wallet.updatedAt.getTime() === instant.open.getTime()
      const same = kept && stamped && wallet.balance.amount === amount.hundred

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit with a negative amount', () => {
    type Params = { version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'negated ten',
        description: 'WHEN the debit amount is negative SHOULD throw',
        params: { version: revision.open },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(amount.hundred, currency.brl)
      const positive = Money.from({ amount: amount.ten, currency: currency.brl })
      const stake = positive.negate()
      const read = () => wallet.debit(stake, instant.move)
      const refused = WalletProbe.failed(read)
      const kept = refused && wallet.version === params.version

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit with another currency', () => {
    type Params = { version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'dollars on a real wallet',
        description: 'WHEN BRL debits USD SHOULD throw',
        params: { version: revision.open },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(amount.hundred, currency.brl)
      const stake = Money.from({ amount: amount.ten, currency: currency.usd })
      const read = () => wallet.debit(stake, instant.move)
      const refused = WalletProbe.failed(read)
      const kept = refused && wallet.version === params.version && wallet.balance.amount === amount.hundred

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('credit', () => {
    type Params = { opening: string; prize: string; left: string; version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'ten on twenty',
        description: 'WHEN 20.00 credits 10.00 SHOULD equal 30.00 and version 2',
        params: {
          opening: amount.twenty,
          prize: amount.ten,
          left: amount.thirty,
          version: revision.moved,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const wallet = WalletProbe.open(params.opening, currency.brl)
      const prize = Money.from({ amount: params.prize, currency: currency.brl })

      wallet.credit(prize, instant.move)

      const left = wallet.balance.amount === params.left
      const moved = wallet.version === params.version
      const kept = left && moved

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('rehydrate', () => {
    type Params = { amount: string; version: number }

    const theories: WalletTheory<Params>[] = [
      {
        title: 'stored version',
        description: 'WHEN the persisted balance is negative SHOULD rebuild without throwing',
        params: { amount: amount.ten, version: revision.stored },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletTheory<Params>) => {
      const positive = Money.from({ amount: params.amount, currency: currency.brl })
      const balance = positive.negate()
      const schema = {
        id: identity.wallet,
        playerId: identity.player,
        balance,
        version: params.version,
        createdAt: instant.open,
        updatedAt: instant.move,
      }
      const wallet = Wallet.rehydrate(schema)
      const negative = wallet.balance.isNegative()
      const kept = negative && wallet.version === params.version

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
