import { Module } from '@nestjs/common'
import { ObservabilityModule } from '@infrastructure/observability'
import { JourneyStoreModule } from '@infrastructure/journey'
import { JourneyService } from './services'
import { FindJourneyUseCase } from './use-cases'

const moduleImports = [JourneyStoreModule, ObservabilityModule]
const moduleProviders = [JourneyService, FindJourneyUseCase]
const moduleExports = [JourneyService, FindJourneyUseCase]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class JourneysModule {}
