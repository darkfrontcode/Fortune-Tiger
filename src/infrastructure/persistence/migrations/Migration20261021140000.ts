import { Migration } from '@mikro-orm/migrations'

export class Migration20261021140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create type "wager_transaction_kind" as enum (
        'OPENING',
        'BET',
        'WIN',
        'LOSS',
        'REFUND',
        'ROLLBACK'
      );
    `)
    this.addSql(`
      create type "wager_transaction_status" as enum (
        'PENDING',
        'PENDING_REFERENCE',
        'PROCESSED',
        'REJECTED',
        'FAILED'
      );
    `)
    this.addSql(`
      create type "failure_code" as enum (
        'INSUFFICIENT_FUNDS',
        'REVERSAL_INSUFFICIENT_FUNDS',
        'CURRENCY_MISMATCH',
        'WALLET_NOT_FOUND',
        'PLAYER_WALLET_MISMATCH',
        'INVALID_KIND',
        'INVALID_REFERENCE_KIND',
        'REFERENCE_NOT_FOUND',
        'REFERENCE_ALREADY_REVERSED',
        'REFERENCE_AMOUNT_MISMATCH',
        'REFERENCE_SCOPE_MISMATCH',
        'IDEMPOTENCY_PAYLOAD_CONFLICT',
        'OPENING_NOT_ALLOWED',
        'NEGATIVE_AMOUNT',
        'INVALID_MONEY'
      );
    `)
    this.addSql(`
      create table "wager_transactions" (
        "id" uuid not null,
        "provider_id" text not null,
        "external_transaction_id" text not null,
        "idempotency_key" text not null,
        "payload_hash" text not null,
        "wallet_id" uuid not null,
        "player_id" text not null,
        "round_id" text not null,
        "game_id" text not null,
        "kind" "wager_transaction_kind" not null,
        "amount" numeric(20,2) not null,
        "currency" char(3) not null,
        "reference_external_transaction_id" text null,
        "reference_transaction_id" uuid null,
        "status" "wager_transaction_status" not null,
        "failure_code" "failure_code" null,
        "observed_balance" numeric(20,2) null,
        "created_at" timestamptz not null,
        "processed_at" timestamptz null,
        constraint "wager_transactions_pkey" primary key ("id"),
        constraint "wager_transactions_amount_check" check ("amount" >= 0)
      );
    `)
    this.addSql(`
      alter table "wager_transactions"
      add constraint "wager_transactions_idempotency_key_unique" unique ("idempotency_key");
    `)
    this.addSql(`
      alter table "wager_transactions"
      add constraint "wager_transactions_provider_external_unique"
      unique ("provider_id", "external_transaction_id");
    `)
    this.addSql(`
      alter table "wager_transactions"
      add constraint "wager_transactions_wallet_id_foreign"
      foreign key ("wallet_id") references "wallets" ("id") on update cascade;
    `)
    this.addSql(`
      create index "wager_transactions_wallet_id_index"
      on "wager_transactions" ("wallet_id");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wager_transactions" cascade;`)
    this.addSql(`drop type if exists "failure_code";`)
    this.addSql(`drop type if exists "wager_transaction_status";`)
    this.addSql(`drop type if exists "wager_transaction_kind";`)
  }
}
