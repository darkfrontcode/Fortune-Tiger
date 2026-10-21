import type { MikroORM } from '@mikro-orm/postgresql'
import { createOrm } from '../orm.factory'

const tables = [
  'inbox_messages',
  'outbox_messages',
  'wallet_ledger_entries',
  'wager_transactions',
  'wallets',
]

export class PersistenceHarness {
  static async open(): Promise<MikroORM> {
    const orm = await createOrm(undefined, true)
    const migrator = orm.getMigrator()

    await migrator.up()

    return orm
  }

  static async reset(orm: MikroORM): Promise<void> {
    const connection = orm.em.getConnection()
    const quoted = tables.map((table) => `"${table}"`).join(', ')

    await connection.execute(`truncate table ${quoted} restart identity cascade;`)
    orm.em.clear()
  }

  static async close(orm: MikroORM): Promise<void> {
    await orm.close(true)
  }
}
