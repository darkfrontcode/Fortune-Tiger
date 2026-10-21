import { Migration } from '@mikro-orm/migrations'

export class Migration20261021170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "wager_transactions"
      add column "attempts" int not null default 0;
    `)
    this.addSql(`
      alter table "wager_transactions"
      add column "next_attempt_at" timestamptz null;
    `)
    this.addSql(`
      create index "wager_transactions_status_next_attempt_at_index"
        on "wager_transactions" ("status", "next_attempt_at");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "wager_transactions_status_next_attempt_at_index";`)
    this.addSql(`
      alter table "wager_transactions"
      drop column if exists "next_attempt_at";
    `)
    this.addSql(`
      alter table "wager_transactions"
      drop column if exists "attempts";
    `)
  }
}
