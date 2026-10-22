import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { IdempotenciesModule } from '@application/idempotencies/idempotencies.module'
import { RECONCILIATION_GATEWAY } from '@application/reconciliations/tokens'
import { REFERENCE_GATEWAY, REFERENCE_READER } from '@application/references/tokens'
import { WAGER_GATEWAY, WAGER_READER } from '@application/wagers/tokens'
import { LEDGER_READER, WALLET_OPENING, WALLET_READER } from '@application/wallets/tokens'
import { ReferenceMediator } from '@application/wagers/mediators'
import { WagerMediator } from '@application/wagers/mediators'
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
