import { LedgerDirection } from '../../../domain/ledger/enums'
import { Ledger } from '../../../domain/ledger'
import { LedgerType } from '../../../domain/ledger/types'
import type { Money } from '../../../domain/money'
import type { Wallet } from '../../../domain/wallet'
import type { FailureCode, WagerTransaction } from '../../../domain/wager'

type Input = LedgerType.Input

export class WagerMove {
  static credit(
    wager: WagerTransaction,
    wallet: Wallet,
    ledgerId: string,
    at: Date,
    link: string | undefined,
  ): Ledger | undefined {
    const before = wallet.balance
    const after = before.add(wager.money)

    return WagerMove.commit(LedgerDirection.CREDIT, wager, wallet, ledgerId, before, after, at, link)
  }

  static debit(
    wager: WagerTransaction,
    wallet: Wallet,
    ledgerId: string,
    at: Date,
    link: string | undefined,
    code: FailureCode,
  ): Ledger | undefined {
    const before = wallet.balance
    const after = before.subtract(wager.money)
    const short = after.isNegative()

    if (short) {
      wager.reject(code)

      return undefined
    }

    return WagerMove.commit(LedgerDirection.DEBIT, wager, wallet, ledgerId, before, after, at, link)
  }

  private static commit(
    direction: LedgerDirection,
    wager: WagerTransaction,
    wallet: Wallet,
    ledgerId: string,
    before: Money,
    after: Money,
    at: Date,
    link: string | undefined,
  ): Ledger | undefined {
    const same = before.equals(after)

    if (same) {
      wager.markProcessed(link, at)

      return undefined
    }

    const credit = direction === LedgerDirection.CREDIT
    const debit = direction === LedgerDirection.DEBIT

    if (credit) { wallet.credit(wager.money, at) }

    if (debit) { wallet.debit(wager.money, at) }

    const ledger = WagerMove.record(direction, wager, wallet, ledgerId, before, after, at)

    wager.markProcessed(link, at)

    return ledger
  }

  private static record(
    direction: LedgerDirection,
    wager: WagerTransaction,
    wallet: Wallet,
    ledgerId: string,
    before: Money,
    after: Money,
    at: Date,
  ): Ledger {
    const input: Input = {
      id: ledgerId,
      walletId: wallet.id,
      transactionId: wager.id,
      direction,
      money: wager.money,
      balanceBefore: before,
      balanceAfter: after,
      createdAt: at,
    }

    return Ledger.create(input)
  }
}
