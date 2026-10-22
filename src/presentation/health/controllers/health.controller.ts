import { Controller, Get } from '@nestjs/common'
import {
  CheckHealthLivenessUseCase,
  CheckHealthReadinessUseCase,
} from '@application/health'
import type { HealthType } from '@application/health'

@Controller('health')
export class HealthController {
  constructor(
    private readonly checkHealthLiveness: CheckHealthLivenessUseCase,
    private readonly checkHealthReadiness: CheckHealthReadinessUseCase,
  ) {}

  @Get('live')
  live(): HealthType.Output {
    return this.checkHealthLiveness.execute()
  }

  @Get('ready')
  ready(): Promise<HealthType.Output> {
    return this.checkHealthReadiness.execute()
  }
}
