import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/health'

const ping = 'select 1'

@Injectable()
export class DatabaseReadiness implements ReadinessProtocol {
  constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

  async check(): Promise<boolean> {
    try {
      await this.orm.em.getConnection().execute(ping)

      return true
    } catch {
      return false
    }
  }
}
