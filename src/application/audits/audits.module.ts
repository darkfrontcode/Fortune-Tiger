import { Module } from '@nestjs/common'
import { AuditStoreModule } from '@infrastructure/audit'
import { FindWagerAuditUseCase } from './use-cases'

const moduleImports = [AuditStoreModule]
const moduleProviders = [FindWagerAuditUseCase]
const moduleExports = [FindWagerAuditUseCase]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class AuditsModule {}
