import { Module } from '@nestjs/common'
import { PersistenceModule } from '../../infrastructure/persistence'
import { ObservabilityModule } from '../../infrastructure/observability'
import { ReconciliationService } from './reconciliation.service'

const moduleImports = [PersistenceModule, ObservabilityModule]

@Module({
  imports: moduleImports,
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationsModule {}
