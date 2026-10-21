import type { MikroORM } from '@mikro-orm/postgresql'
import type { WagerTransaction } from '../../../domain/wager/wager'
import { WagerSubmitWriter } from './wager-submit.writer'

export class WagerBetWriter {
  private readonly submitter: WagerSubmitWriter

  constructor(orm: MikroORM) {
    this.submitter = new WagerSubmitWriter(orm)
  }

  async place(wager: WagerTransaction, at: Date): Promise<void> {
    const run = async () => {
      await this.submitter.submit(wager, at)
    }

    await run()
  }
}
