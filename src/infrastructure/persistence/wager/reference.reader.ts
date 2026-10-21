import type { MikroORM } from '@mikro-orm/postgresql'
import type { ReferenceReaderProtocol } from '../../../application/protocols'
import type { WagerTransaction } from '../../../domain/wager/wager'
import { WagerTransactionRepository } from './wager-transaction.repository'

export class ReferenceReader implements ReferenceReaderProtocol {
  constructor(private readonly orm: MikroORM) {}

  async due(at: Date, limit: number): Promise<Array<string>> {
    const manager = this.orm.em.fork()
    const wagers = new WagerTransactionRepository(manager)
    const due = await wagers.dueForReference(at, limit)
    const toId = (wager: WagerTransaction) => wager.id

    return due.map(toId)
  }
}
