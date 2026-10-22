import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { ReconciliationsModule } from '../../application/reconciliations'
import { PROVIDER_IDENTITY } from '../../application/tokens'
import { TransactionsModule } from '../../application/transactions'
import { ObservabilityModule } from '../../infrastructure/observability'
import { PersistenceModule } from '../../infrastructure/persistence'
import { AuthGuard } from './auth.guard'
import { HttpFailureFilter } from './http-failure.filter'
import { AnonymousProviderIdentity } from './identity'
import { WagerController } from './wager.controller'
import { WalletController } from './wallet.controller'

const moduleImports = [
  PersistenceModule,
  TransactionsModule,
  ReconciliationsModule,
  ObservabilityModule,
]

const moduleControllers = [WalletController, WagerController]

const moduleProviders = [
  AuthGuard,
  { provide: PROVIDER_IDENTITY, useClass: AnonymousProviderIdentity },
  { provide: APP_FILTER, useClass: HttpFailureFilter },
]

@Module({
  imports: moduleImports,
  controllers: moduleControllers,
  providers: moduleProviders,
})
export class HttpModule {}
