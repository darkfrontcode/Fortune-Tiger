import { Module } from '@nestjs/common'
import { Environment } from './environment'

@Module({
  providers: [Environment],
  exports: [Environment],
})
export class EnvironmentModule {}
