import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../../application/protocols'
import { Money } from '../../money/money'
import { Ledger } from '../ledger'
import { LedgerDirection } from '../enums'

interface LedgerTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  twenty: '20.00',
  eighty: '80.00',
  hundred: '100.00',
  hundredTwenty: '120.00',
}

const identity = {
  ledger: 'ledger-id',
  wallet: 'wallet-id',
  transaction: 'transaction-id',
}

const instant = {
  posted: new Date('2026-01-01T00:00:00.000Z'),
}

class LedgerProbe {
  static failed(read: () => void): boolean {
    try {
      read()
      return false
    } catch {
      return true
    }
  }

  static money(value: string, code: string): Money {
    return Money.from({ amount: value, currency: code })
  }

  static post(
    direction: LedgerDirection,
    before: string,
    moved: string,
    after: string,
    code: string,
  ): Ledger {
    const input = {
      id: identity.ledger,
      walletId: identity.wallet,
      transactionId: identity.transaction,
      direction,
      money: LedgerProbe.money(moved, code),
      balanceBefore: LedgerProbe.money(before, code),
      balanceAfter: LedgerProbe.money(after, code),
      createdAt: instant.posted,
    }

    return Ledger.create(input)
  }
}

describe('Ledger', () => {
  describe('credit', () => {
    type Params = { before: string; moved: string; after: string; currency: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'one hundred plus twenty',
        description: 'WHEN the credit closes the balance SHOULD keep the entry',
        params: {
          before: amount.hundred,
          moved: amount.twenty,
          after: amount.hundredTwenty,
          currency: currency.brl,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const ledger = LedgerProbe.post(
        LedgerDirection.CREDIT,
        params.before,
        params.moved,
        params.after,
        params.currency,
      )
      const credit = ledger.direction === LedgerDirection.CREDIT
      const closed = ledger.balanceAfter.amount === params.after
      const kept = credit && closed && ledger.isBalanced()

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit', () => {
    type Params = { before: string; moved: string; after: string; currency: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'one hundred minus eighty',
        description: 'WHEN the debit closes the balance SHOULD keep the entry',
        params: {
          before: amount.hundred,
          moved: amount.eighty,
          after: amount.twenty,
          currency: currency.brl,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const ledger = LedgerProbe.post(
        LedgerDirection.DEBIT,
        params.before,
        params.moved,
        params.after,
        params.currency,
      )
      const debit = ledger.direction === LedgerDirection.DEBIT
      const closed = ledger.balanceAfter.amount === params.after
      const kept = debit && closed && ledger.isBalanced()

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('credit that does not close', () => {
    type Params = { before: string; moved: string; after: string; currency: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'credit stored as a debit result',
        description: 'WHEN balance after ignores the credit SHOULD throw',
        params: {
          before: amount.hundred,
          moved: amount.twenty,
          after: amount.eighty,
          currency: currency.brl,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const read = () => LedgerProbe.post(
        LedgerDirection.CREDIT,
        params.before,
        params.moved,
        params.after,
        params.currency,
      )
      const refused = LedgerProbe.failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('debit that does not close', () => {
    type Params = { before: string; moved: string; after: string; currency: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'debit stored as a credit result',
        description: 'WHEN balance after ignores the debit SHOULD throw',
        params: {
          before: amount.hundred,
          moved: amount.eighty,
          after: amount.hundredTwenty,
          currency: currency.brl,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const read = () => LedgerProbe.post(
        LedgerDirection.DEBIT,
        params.before,
        params.moved,
        params.after,
        params.currency,
      )
      const refused = LedgerProbe.failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('currency conflict', () => {
    type Params = { before: string; moved: string; after: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'dollars inside a reais balance',
        description: 'WHEN the money currency differs SHOULD throw',
        params: {
          before: amount.hundred,
          moved: amount.twenty,
          after: amount.hundredTwenty,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const input = {
        id: identity.ledger,
        walletId: identity.wallet,
        transactionId: identity.transaction,
        direction: LedgerDirection.CREDIT,
        money: LedgerProbe.money(params.moved, currency.usd),
        balanceBefore: LedgerProbe.money(params.before, currency.brl),
        balanceAfter: LedgerProbe.money(params.after, currency.brl),
        createdAt: instant.posted,
      }
      const read = () => Ledger.create(input)
      const refused = LedgerProbe.failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('rehydrate', () => {
    type Params = { before: string; moved: string; after: string; currency: string }

    const theories: LedgerTheory<Params>[] = [
      {
        title: 'stored debit that does not close',
        description: 'WHEN the stored entry is unbalanced SHOULD rebuild without throwing',
        params: {
          before: amount.hundred,
          moved: amount.eighty,
          after: amount.hundred,
          currency: currency.brl,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerTheory<Params>) => {
      const schema = {
        id: identity.ledger,
        walletId: identity.wallet,
        transactionId: identity.transaction,
        direction: LedgerDirection.DEBIT,
        money: LedgerProbe.money(params.moved, params.currency),
        balanceBefore: LedgerProbe.money(params.before, params.currency),
        balanceAfter: LedgerProbe.money(params.after, params.currency),
        createdAt: instant.posted,
      }
      const ledger = Ledger.rehydrate(schema)
      const rebuilt = ledger.balanceAfter.amount === params.after
      const open = rebuilt && !ledger.isBalanced()

      expect(open).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
