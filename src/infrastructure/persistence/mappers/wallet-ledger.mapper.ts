import { Money } from '@domain/money/money'
import { Ledger } from '@domain/ledger/ledger'
import { WalletEntity } from '../entities/wallet.entity'
import { WalletLedgerEntity } from '../entities/wallet-ledger.entity'

export class WalletLedgerMapper {
  toDomain(entity: WalletLedgerEntity): Ledger {
    const money = Money.from({ amount: entity.amount, currency: entity.currency })

    const balanceBefore = Money.from({
      amount: entity.balanceBefore,
      currency: entity.currency,
    })

    const balanceAfter = Money.from({
      amount: entity.balanceAfter,
      currency: entity.currency,
    })

    const schema = {
      id: entity.id,
      walletId: entity.wallet.id,
      transactionId: entity.transactionId,
      direction: entity.direction,
      money,
      balanceBefore,
      balanceAfter,
      createdAt: entity.createdAt,
    }

    return Ledger.rehydrate(schema)
  }

  toEntity(ledger: Ledger, wallet: WalletEntity): WalletLedgerEntity {
    const entity = new WalletLedgerEntity()

    entity.id = ledger.id
    entity.wallet = wallet
    entity.transactionId = ledger.transactionId
    entity.direction = ledger.direction
    entity.amount = ledger.money.amount
    entity.currency = ledger.money.currency
    entity.balanceBefore = ledger.balanceBefore.amount
    entity.balanceAfter = ledger.balanceAfter.amount
    entity.createdAt = ledger.createdAt

    return entity
  }
}
