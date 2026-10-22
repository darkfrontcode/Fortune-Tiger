import { Module } from '@nestjs/common'
import { ReferencesModule } from '@application/references'
import { WagersModule } from '@application/wagers'
import { MessagingModule } from '@infrastructure/messaging'
import { ObservabilityModule } from '@infrastructure/observability'
import { PersistenceModule, ReferenceWorker } from '@infrastructure/persistence'
import { HealthModule } from '@presentation/health'
import { HttpModule } from '@presentation/http'
import { RuntimeService } from './runtime.service'

const moduleImports = [
  ObservabilityModule,
  PersistenceModule,
  WagersModule,
  ReferencesModule,
  MessagingModule,
  HealthModule,
  HttpModule,
]

const moduleProviders = [ReferenceWorker, RuntimeService]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
})
export class AppModule {}
