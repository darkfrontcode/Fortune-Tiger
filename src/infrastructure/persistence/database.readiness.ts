import type { MikroORM } from '@mikro-orm/core'
import type { ReadinessProtocol } from '../../application/protocols'

const ping = 'select 1'

export class DatabaseReadiness implements ReadinessProtocol {
  constructor(private readonly orm: MikroORM) {}

  async check(): Promise<boolean> {
    try {
      await this.orm.em.getConnection().execute(ping)

      return true
    } catch {
      return false
    }
  }
}
