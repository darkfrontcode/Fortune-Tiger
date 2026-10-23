import { Migration } from '@mikro-orm/migrations'

export class Migration20261023090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "wallet_ledger_entries"
      add constraint "wallet_ledger_entries_transaction_id_foreign"
      foreign key ("transaction_id") references "wager_transactions" ("id") on update cascade;
    `)
    this.addSql(`
      create function "validate_wallet_ledger_entry"() returns trigger as $$
      declare
        wallet_currency char(3);
        transaction_wallet_id uuid;
        transaction_currency char(3);
      begin
        select "currency" into wallet_currency from "wallets" where "id" = NEW."wallet_id";
        select "wallet_id", "currency" into transaction_wallet_id, transaction_currency
        from "wager_transactions" where "id" = NEW."transaction_id";

        if transaction_wallet_id is null then
          raise exception 'Ledger transaction % does not exist', NEW."transaction_id";
        end if;
        if transaction_wallet_id != NEW."wallet_id" then
          raise exception 'Ledger wallet does not match its transaction';
        end if;
        if wallet_currency != NEW."currency" or transaction_currency != NEW."currency" then
          raise exception 'Ledger currency does not match its wallet and transaction';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
    `)
    this.addSql(`
      create trigger "wallet_ledger_entries_validate_trigger"
      before insert or update on "wallet_ledger_entries"
      for each row execute function "validate_wallet_ledger_entry"();
    `)
    this.addSql(`
      create function "prevent_wallet_ledger_mutation"() returns trigger as $$
      begin
        raise exception 'Wallet ledger entries are immutable';
      end;
      $$ language plpgsql;
    `)
    this.addSql(`
      create trigger "wallet_ledger_entries_immutable_trigger"
      before update or delete on "wallet_ledger_entries"
      for each row execute function "prevent_wallet_ledger_mutation"();
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop trigger if exists "wallet_ledger_entries_immutable_trigger" on "wallet_ledger_entries";`)
    this.addSql(`drop function if exists "prevent_wallet_ledger_mutation"();`)
    this.addSql(`drop trigger if exists "wallet_ledger_entries_validate_trigger" on "wallet_ledger_entries";`)
    this.addSql(`drop function if exists "validate_wallet_ledger_entry"();`)
    this.addSql(`
      alter table "wallet_ledger_entries"
      drop constraint if exists "wallet_ledger_entries_transaction_id_foreign";
    `)
  }
}
