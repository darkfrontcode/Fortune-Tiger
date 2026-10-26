import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import config from '../../../../mikro-orm.config'
import type { Environment } from '../../environment'
import type { FactoryProtocol } from '../../protocols'
import { DATABASE_URL_REQUIRED_MESSAGE } from '../data'

@Injectable()
export class OrmFactory implements FactoryProtocol<Promise<MikroORM>> {
  constructor(private readonly environment: Environment) {}

  create(): Promise<MikroORM> {
    return this.open(this.environment.databaseUrl)
  }

  isolated(): Promise<MikroORM> {
    return this.open(this.environment.databaseUrl, true)
  }

  private async open(clientUrl: string | undefined, allowGlobalContext = false): Promise<MikroORM> {
    if (clientUrl === undefined || clientUrl === '') {
      throw new Error(DATABASE_URL_REQUIRED_MESSAGE)
    }

    const orm = await MikroORM.init({ ...config, clientUrl, allowGlobalContext })

    return orm
  }
}
