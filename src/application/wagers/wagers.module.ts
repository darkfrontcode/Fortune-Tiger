import { Module } from '@nestjs/common'
import { PersistenceModule } from '@infrastructure/persistence'
import { ObservabilityModule } from '@infrastructure/observability'
import { IdempotenciesModule } from '../idempotencies/idempotencies.module'
import { JourneysModule } from '../journeys'
import {
  FindWagerByProviderUseCase,
  FindWagerUseCase,
  SubmitWagerUseCase,
} from './use-cases'

const moduleImports = [PersistenceModule, IdempotenciesModule, ObservabilityModule, JourneysModule]
const moduleProviders = [FindWagerByProviderUseCase, FindWagerUseCase, SubmitWagerUseCase]
const moduleExports = [FindWagerByProviderUseCase, FindWagerUseCase, SubmitWagerUseCase]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class WagersModule {}
