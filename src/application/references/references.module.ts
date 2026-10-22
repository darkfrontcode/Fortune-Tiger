import { Module } from '@nestjs/common'
import { PersistenceModule } from '@infrastructure/persistence'
import { RetryReferencesUseCase } from './use-cases'

@Module({
  imports: [PersistenceModule],
  providers: [RetryReferencesUseCase],
  exports: [RetryReferencesUseCase],
})
export class ReferencesModule {}
