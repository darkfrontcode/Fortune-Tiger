import { Module } from '@nestjs/common'
import { EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { MongoConnection } from './mongo.connection'

const moduleImports = [EnvironmentModule, ObservabilityModule]
const moduleProviders = [MongoConnection]
const moduleExports = [MongoConnection]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class MongoModule {}
