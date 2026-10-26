import { Module } from '@nestjs/common'
import { JOURNEY_STORE } from '@application/journeys/tokens'
import { MongoModule } from '../mongo'
import { JourneyRepository } from './repositories/journey.repository'

const moduleImports = [MongoModule]
const moduleProviders = [
  JourneyRepository,
  { provide: JOURNEY_STORE, useExisting: JourneyRepository },
]
const moduleExports = [JOURNEY_STORE]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class JourneyStoreModule {}
