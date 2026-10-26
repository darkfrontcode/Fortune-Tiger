import { Entity, Enum, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { LedgerDirection } from '@domain/ledger/enums'
import { WalletEntity } from './wallet.entity'

@Entity({ tableName: 'wallet_ledger_entries' })
export class WalletLedgerEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @ManyToOne(() => WalletEntity, { fieldName: 'wallet_id' })
  @Index()
  wallet!: WalletEntity

  @Property({ fieldName: 'transaction_id', type: 'uuid' })
  @Unique()
  transactionId!: string

  @Enum({ items: () => LedgerDirection, nativeEnumName: 'ledger_direction' })
  direction!: LedgerDirection

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  amount!: string

  @Property({ type: 'char', length: 3 })
  currency!: string

  @Property({ fieldName: 'balance_before', type: 'numeric', precision: 20, scale: 2 })
  balanceBefore!: string

  @Property({ fieldName: 'balance_after', type: 'numeric', precision: 20, scale: 2 })
  balanceAfter!: string

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
