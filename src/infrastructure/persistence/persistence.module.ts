import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { IdempotenciesModule } from '@application/idempotencies/idempotencies.module'
import {
  LEDGER_READER,
  RECONCILIATION_GATEWAY,
  REFERENCE_GATEWAY,
  REFERENCE_READER,
  WAGER_GATEWAY,
  WAGER_READER,
  WALLET_OPENING,
  WALLET_READER,
} from '@application/tokens'
import { ReferenceMediator } from '@application/transactions/wager/mediators/reference.mediator'
import { WagerMediator } from '@application/transactions/wager/mediators/wager.mediator'
import { Environment, EnvironmentModule } from '../environment'
import { WagerEventsMapper } from '../messaging/mappers'
import { DatabaseReadiness } from './database.readiness'
import { LedgerReader } from './ledger/ledger.reader'
import { createOrm } from './orm.factory'
import { ReconciliationReader } from './reconciliation/reconciliation.reader'
import { ReferenceReader } from './wager/reference.reader'
import { ReferenceRetryWriter } from './wager/reference.retry.writer'
import { WagerSubmitWriter } from './wager/wager-submit.writer'
import { WagerReader } from './wager/wager.reader'
import { WalletOpeningWriter } from './wallet/wallet-opening.writer'
import { WalletReader } from './wallet/wallet.reader'

const openOrm = (environment: Environment) => createOrm(environment.databaseUrl)

const moduleImports = [EnvironmentModule, IdempotenciesModule]

const moduleExports = [
  MikroORM,
  DatabaseReadiness,
  WalletOpeningWriter,
  WAGER_GATEWAY,
  WAGER_READER,
  WALLET_READER,
  WALLET_OPENING,
  LEDGER_READER,
  REFERENCE_READER,
  REFERENCE_GATEWAY,
  RECONCILIATION_GATEWAY,
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
    WagerReader,
    WalletReader,
    LedgerReader,
    ReconciliationReader,
    ReferenceReader,
    ReferenceRetryWriter,
    WalletOpeningWriter,
    { provide: WAGER_GATEWAY, useExisting: WagerSubmitWriter },
    { provide: WAGER_READER, useExisting: WagerReader },
    { provide: WALLET_READER, useExisting: WalletReader },
    { provide: WALLET_OPENING, useExisting: WalletOpeningWriter },
    { provide: LEDGER_READER, useExisting: LedgerReader },
    { provide: RECONCILIATION_GATEWAY, useExisting: ReconciliationReader },
    { provide: REFERENCE_READER, useExisting: ReferenceReader },
    { provide: REFERENCE_GATEWAY, useExisting: ReferenceRetryWriter },
  ],
  exports: moduleExports,
})
export class PersistenceModule {}
