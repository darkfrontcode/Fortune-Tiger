import { Module } from '@nestjs/common'
import { PersistenceModule } from '../../infrastructure/persistence'
import { IdempotenciesModule } from '../idempotencies/idempotencies.module'
import { WagerService } from './wager'

const moduleImports = [PersistenceModule, IdempotenciesModule]

@Module({
  imports: moduleImports,
  providers: [WagerService],
  exports: [WagerService],
})
export class TransactionsModule {}
