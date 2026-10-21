import { Entity, Enum, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../domain/wager/enums'
import { WalletEntity } from '../wallet/wallet.entity'

@Entity({ tableName: 'wager_transactions' })
@Unique({ properties: ['idempotencyKey'] })
@Unique({ properties: ['providerId', 'externalTransactionId'] })
export class WagerTransactionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ fieldName: 'provider_id', type: 'text' })
  providerId!: string

  @Property({ fieldName: 'external_transaction_id', type: 'text' })
  externalTransactionId!: string

  @Property({ fieldName: 'idempotency_key', type: 'text' })
  idempotencyKey!: string

  @Property({ fieldName: 'payload_hash', type: 'text' })
  payloadHash!: string

  @ManyToOne(() => WalletEntity, { fieldName: 'wallet_id' })
  @Index()
  wallet!: WalletEntity

  @Property({ fieldName: 'player_id', type: 'text' })
  playerId!: string

  @Property({ fieldName: 'round_id', type: 'text' })
  roundId!: string

  @Property({ fieldName: 'game_id', type: 'text' })
  gameId!: string

  @Enum({ items: () => WagerTransactionKind, nativeEnumName: 'wager_transaction_kind' })
  kind!: WagerTransactionKind

  @Property({ type: 'numeric', precision: 20, scale: 2 })
  amount!: string

  @Property({ type: 'char', length: 3 })
  currency!: string

  @Property({ fieldName: 'reference_external_transaction_id', type: 'text', nullable: true })
  referenceExternalTransactionId?: string

  @Property({ fieldName: 'reference_transaction_id', type: 'uuid', nullable: true })
  referenceTransactionId?: string

  @Enum({ items: () => WagerTransactionStatus, nativeEnumName: 'wager_transaction_status' })
  status!: WagerTransactionStatus

  @Enum({ items: () => FailureCode, nativeEnumName: 'failure_code', nullable: true })
  failureCode?: FailureCode

  @Property({ fieldName: 'observed_balance', type: 'numeric', precision: 20, scale: 2, nullable: true })
  observedBalance?: string

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Property({ fieldName: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date
}
