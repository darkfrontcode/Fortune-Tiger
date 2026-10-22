import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { IdempotenciesModule } from '../../application/idempotencies/idempotencies.module'
import { REFERENCE_GATEWAY, REFERENCE_READER, WAGER_GATEWAY } from '../../application/tokens'
import { ReferenceMediator } from '../../application/transactions/wager/mediators/reference.mediator'
import { WagerMediator } from '../../application/transactions/wager/mediators/wager.mediator'
import { Environment, EnvironmentModule } from '../environment'
import { WagerEventsMapper } from '../messaging/mappers'
import { DatabaseReadiness } from './database.readiness'
import { createOrm } from './orm.factory'
import { ReferenceReader } from './wager/reference.reader'
import { ReferenceRetryWriter } from './wager/reference.retry.writer'
import { WagerSubmitWriter } from './wager/wager-submit.writer'
import { WalletOpeningWriter } from './wallet/wallet-opening.writer'

const openOrm = (environment: Environment) => createOrm(environment.databaseUrl)

const moduleImports = [EnvironmentModule, IdempotenciesModule]

const moduleExports = [
  MikroORM,
  DatabaseReadiness,
  WalletOpeningWriter,
  WAGER_GATEWAY,
  REFERENCE_READER,
  REFERENCE_GATEWAY,
]

@Module({
  imports: moduleImports,
  providers: [
    { provide: MikroORM, useFactory: openOrm, inject: [Environment] },
    WagerEventsMapper,
    WagerMediator,
    ReferenceMediator,
    DatabaseReadiness,
    WagerSubmitWriter,
    ReferenceReader,
    ReferenceRetryWriter,
    WalletOpeningWriter,
    { provide: WAGER_GATEWAY, useExisting: WagerSubmitWriter },
    { provide: REFERENCE_READER, useExisting: ReferenceReader },
    { provide: REFERENCE_GATEWAY, useExisting: ReferenceRetryWriter },
  ],
  exports: moduleExports,
})
export class PersistenceModule {}
