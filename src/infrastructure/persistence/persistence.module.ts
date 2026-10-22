import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { REFERENCE_GATEWAY, REFERENCE_READER, WAGER_GATEWAY } from '../../application/tokens'
import { Environment, EnvironmentModule } from '../environment'
import { DatabaseReadiness } from './database.readiness'
import { createOrm } from './orm.factory'
import { ReferenceReader, ReferenceRetryWriter, WagerSubmitWriter } from './wager'

const openOrm = (environment: Environment) => createOrm(environment.databaseUrl)

const moduleExports = [MikroORM, DatabaseReadiness, WAGER_GATEWAY, REFERENCE_READER, REFERENCE_GATEWAY]

@Module({
  imports: [EnvironmentModule],
  providers: [
    { provide: MikroORM, useFactory: openOrm, inject: [Environment] },
    { provide: WagerSubmitWriter, useFactory: (orm: MikroORM) => new WagerSubmitWriter(orm), inject: [MikroORM] },
    { provide: ReferenceReader, useFactory: (orm: MikroORM) => new ReferenceReader(orm), inject: [MikroORM] },
    { provide: ReferenceRetryWriter, useFactory: (orm: MikroORM) => new ReferenceRetryWriter(orm), inject: [MikroORM] },
    { provide: DatabaseReadiness, useFactory: (orm: MikroORM) => new DatabaseReadiness(orm), inject: [MikroORM] },
    { provide: WAGER_GATEWAY, useExisting: WagerSubmitWriter },
    { provide: REFERENCE_READER, useExisting: ReferenceReader },
    { provide: REFERENCE_GATEWAY, useExisting: ReferenceRetryWriter },
  ],
  exports: moduleExports,
})
export class PersistenceModule {}
