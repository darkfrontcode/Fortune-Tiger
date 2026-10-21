import { Migration } from '@mikro-orm/migrations'

export class Migration20261021120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create type "ledger_direction" as enum ('DEBIT', 'CREDIT');`)
    this.addSql(`
      create table "wallets" (
        "id" uuid not null,
        "player_id" text not null,
        "balance" numeric(20,2) not null,
        "currency" char(3) not null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "wallets_pkey" primary key ("id"),
        constraint "wallets_balance_check" check ("balance" >= 0),
        constraint "wallets_version_check" check ("version" >= 1)
      );
    `)
    this.addSql(`
      alter table "wallets"
      add constraint "wallets_player_id_currency_unique" unique ("player_id", "currency");
    `)
    this.addSql(`
      create table "wallet_ledger_entries" (
        "id" uuid not null,
        "wallet_id" uuid not null,
        "transaction_id" uuid not null,
        "direction" "ledger_direction" not null,
        "amount" numeric(20,2) not null,
        "currency" char(3) not null,
        "balance_before" numeric(20,2) not null,
        "balance_after" numeric(20,2) not null,
        "created_at" timestamptz not null,
        constraint "wallet_ledger_entries_pkey" primary key ("id"),
        constraint "wallet_ledger_entries_amount_check" check ("amount" > 0),
        constraint "wallet_ledger_entries_balance_before_check" check ("balance_before" >= 0),
        constraint "wallet_ledger_entries_balance_after_check" check ("balance_after" >= 0),
        constraint "wallet_ledger_entries_direction_balance_check" check (
          (
            "direction" = 'DEBIT'
            and "balance_after" = "balance_before" - "amount"
          )
          or (
            "direction" = 'CREDIT'
            and "balance_after" = "balance_before" + "amount"
          )
        )
      );
    `)
    this.addSql(`
      alter table "wallet_ledger_entries"
      add constraint "wallet_ledger_entries_transaction_id_unique" unique ("transaction_id");
    `)
    this.addSql(`
      alter table "wallet_ledger_entries"
      add constraint "wallet_ledger_entries_wallet_id_foreign"
      foreign key ("wallet_id") references "wallets" ("id") on update cascade;
    `)
    this.addSql(`
      create index "wallet_ledger_entries_wallet_id_index"
      on "wallet_ledger_entries" ("wallet_id");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wallet_ledger_entries" cascade;`)
    this.addSql(`drop table if exists "wallets" cascade;`)
    this.addSql(`drop type if exists "ledger_direction";`)
  }
}
