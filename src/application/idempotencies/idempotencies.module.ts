import { Module } from '@nestjs/common'
import { IdempotencyService } from './services'

@Module({
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotenciesModule {}
