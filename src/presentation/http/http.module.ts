import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { ReconciliationsModule } from '@application/reconciliations'
import { FindWalletUseCase } from '@application/wallets/use-cases'
import { PROVIDER_IDENTITY } from './tokens'
import { TransactionsModule } from '@application/transactions'
import { ObservabilityModule } from '@infrastructure/observability'
import { PersistenceModule } from '@infrastructure/persistence'
import { WagerController, WalletController } from './controllers'
import { AuthGuard } from './guards'
import { HttpFailureFilter } from './filters'
import { AnonymousProviderIdentity } from './providers'

const moduleImports = [
  PersistenceModule,
  TransactionsModule,
  ReconciliationsModule,
  ObservabilityModule,
]

const moduleControllers = [WalletController, WagerController]

const moduleProviders = [
  FindWalletUseCase,
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
