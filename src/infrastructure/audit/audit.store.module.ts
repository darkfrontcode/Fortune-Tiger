import { Module } from '@nestjs/common'
import { AUDIT_STORE } from '@application/audits/tokens'
import { MongoModule } from '../mongo'
import { AuditEventRepository } from './repositories/audit-event.repository'

const moduleImports = [MongoModule]
const moduleProviders = [
  AuditEventRepository,
  { provide: AUDIT_STORE, useExisting: AuditEventRepository },
]
const moduleExports = [AUDIT_STORE]

@Module({
  imports: moduleImports,
  providers: moduleProviders,
  exports: moduleExports,
})
export class AuditStoreModule {}
