import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { WalletReaderProtocol } from '@application/wallets'
import type { Wallet } from '@domain/wallet/wallet'
import { WalletRepository } from '../repositories/wallet.repository'

@Injectable()
export class WalletReader implements WalletReaderProtocol {
  constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

  async findById(id: string): Promise<Wallet | undefined> {
    const manager = this.orm.em.fork()
    const wallets = new WalletRepository(manager)

    return wallets.findById(id)
  }
}
