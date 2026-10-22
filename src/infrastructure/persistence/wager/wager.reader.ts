import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { WagerReaderProtocol } from '@application/protocols'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagerTransactionRepository } from './wager-transaction.repository'

@Injectable()
export class WagerReader implements WagerReaderProtocol {
  constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

  async findById(id: string): Promise<WagerTransaction | undefined> {
    const manager = this.orm.em.fork()
    const wagers = new WagerTransactionRepository(manager)

    return wagers.findById(id)
  }

  async findByProviderAndExternal(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | undefined> {
    const manager = this.orm.em.fork()
    const wagers = new WagerTransactionRepository(manager)

    return wagers.findByProviderAndExternal(providerId, externalTransactionId)
  }
}
