import { Module } from '@nestjs/common'
import { PersistenceModule } from '@infrastructure/persistence'
import { ReferenceService } from './reference.service'

@Module({
  imports: [PersistenceModule],
  providers: [ReferenceService],
  exports: [ReferenceService],
})
export class ReferencesModule {}
