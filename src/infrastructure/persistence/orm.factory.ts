import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/postgresql'
import config from '../../../mikro-orm.config'
import { DATABASE_URL_REQUIRED_MESSAGE } from './data'

export const createOrm = async (databaseUrl?: string) => {
  const fromParam = databaseUrl
  const fromEnv = process.env.DATABASE_URL
  const clientUrl = fromParam ?? fromEnv

  if (clientUrl === undefined || clientUrl === '') {
    throw new Error(DATABASE_URL_REQUIRED_MESSAGE)
  }

  const orm = await MikroORM.init({ ...config, clientUrl })

  return orm
}
