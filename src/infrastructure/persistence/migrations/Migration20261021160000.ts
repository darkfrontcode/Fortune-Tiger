import { Migration } from '@mikro-orm/migrations'

export class Migration20261021160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "outbox_messages" (
        "id" uuid not null,
        "aggregate_id" text not null,
        "event_type" text not null,
        "payload" jsonb not null,
        "occurred_at" timestamptz not null,
        "attempts" int not null default 0,
        "next_attempt_at" timestamptz null,
        "published_at" timestamptz null,
        constraint "outbox_messages_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      create index "outbox_messages_published_at_next_attempt_at_index"
        on "outbox_messages" ("published_at", "next_attempt_at");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "outbox_messages" cascade;`)
  }
}
