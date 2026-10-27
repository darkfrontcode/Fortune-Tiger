import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { IdempotenciesModule } from '@application/idempotencies/idempotencies.module'
import { JourneysModule } from '@application/journeys'
import { RECONCILIATION_GATEWAY } from '@application/reconciliations/tokens'
import { REFERENCE_GATEWAY, REFERENCE_READER } from '@application/references/tokens'
import { WAGER_GATEWAY, WAGER_READER } from '@application/wagers/tokens'
import { LEDGER_READER, WALLET_OPENING, WALLET_READER } from '@application/wallets/tokens'
import { ReferenceMediator } from '@application/wagers/mediators'
import { WagerMediator } from '@application/wagers/mediators'
import { WagerMovesService, WagerReferencesService } from '@application/wagers/services'
import { WagerStrategy } from '@application/wagers/strategies'
import { EnvironmentModule } from '../environment'
import { CacheModule } from '../cache'
import { CachedWagerReader, CachedWalletReader } from '../cache/readers'
import { ObservabilityModule } from '../observability'
import { WagerEventsMapper } from '../messaging/mappers'
import { DatabaseReadiness } from './readiness'
import { LedgerReader } from './readers/ledger.reader'
import { OrmFactory } from './factories'
import { ReconciliationReader } from './readers/reconciliation.reader'
import { ReferenceReader } from './readers/reference.reader'
import { ReferenceRetryWriter } from './writers/reference.retry.writer'
import { WagerSubmitWriter } from './writers/wager-submit.writer'
import { WagerReader } from './readers/wager.reader'
import { WalletOpeningWriter } from './writers/wallet-opening.writer'
import { WalletReader } from './readers/wallet.reader'

const moduleImports = [
  EnvironmentModule,
  IdempotenciesModule,
  ObservabilityModule,
  JourneysModule,
  CacheModule,
]

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
    OrmFactory,
    { provide: MikroORM, useFactory: (factory: OrmFactory) => factory.create(), inject: [OrmFactory] },
    WagerEventsMapper,
    WagerMovesService,
    WagerReferencesService,
    WagerStrategy,
    WagerMediator,
    ReferenceMediator,
    DatabaseReadiness,
    WagerSubmitWriter,
    WagerReader,
    WalletReader,
    CachedWagerReader,
    CachedWalletReader,
    LedgerReader,
    ReconciliationReader,
    ReferenceReader,
    ReferenceRetryWriter,
    WalletOpeningWriter,
    { provide: WAGER_GATEWAY, useExisting: WagerSubmitWriter },
    { provide: WAGER_READER, useExisting: CachedWagerReader },
    { provide: WALLET_READER, useExisting: CachedWalletReader },
    { provide: WALLET_OPENING, useExisting: WalletOpeningWriter },
    { provide: LEDGER_READER, useExisting: LedgerReader },
    { provide: RECONCILIATION_GATEWAY, useExisting: ReconciliationReader },
    { provide: REFERENCE_READER, useExisting: ReferenceReader },
    { provide: REFERENCE_GATEWAY, useExisting: ReferenceRetryWriter },
  ],
  exports: moduleExports,
})
export class PersistenceModule {}
