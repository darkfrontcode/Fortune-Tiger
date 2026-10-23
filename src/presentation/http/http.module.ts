import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { ReconciliationsModule } from '@application/reconciliations'
import {
  FindWalletUseCase,
  ListWalletLedgerUseCase,
  OpenWalletUseCase,
} from '@application/wallets/use-cases'
import { PROVIDER_IDENTITY } from './tokens'
import { WagersModule } from '@application/wagers'
import { Environment, EnvironmentModule } from '@infrastructure/environment'
import { ObservabilityModule } from '@infrastructure/observability'
import { PersistenceModule } from '@infrastructure/persistence'
import { WagerController, WalletController } from './controllers'
import { AuthGuard } from './guards'
import { HttpFailureFilter } from './filters'
import { ProviderIdentityFactory } from './factories'
import type { ProviderIdentityProtocol } from './providers'

const createIdentity = (factory: ProviderIdentityFactory): ProviderIdentityProtocol => factory.create()

const moduleImports = [
  PersistenceModule,
  WagersModule,
  ReconciliationsModule,
  ObservabilityModule,
  EnvironmentModule,
]

const moduleControllers = [WalletController, WagerController]

const moduleProviders = [
  FindWalletUseCase,
  ListWalletLedgerUseCase,
  OpenWalletUseCase,
  AuthGuard,
  ProviderIdentityFactory,
  { provide: PROVIDER_IDENTITY, useFactory: createIdentity, inject: [ProviderIdentityFactory] },
  { provide: APP_FILTER, useClass: HttpFailureFilter },
]

@Module({
  imports: moduleImports,
  controllers: moduleControllers,
  providers: moduleProviders,
})
export class HttpModule {}
