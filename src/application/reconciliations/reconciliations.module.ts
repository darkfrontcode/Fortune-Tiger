import { Module } from '@nestjs/common'
import { PersistenceModule } from '@infrastructure/persistence'
import { ObservabilityModule } from '@infrastructure/observability'
import { ReconcileWalletUseCase } from './use-cases'

const moduleImports = [PersistenceModule, ObservabilityModule]

@Module({
  imports: moduleImports,
  providers: [ReconcileWalletUseCase],
  exports: [ReconcileWalletUseCase],
})
export class ReconciliationsModule {}
