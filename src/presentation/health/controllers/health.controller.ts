import { Controller, Get } from '@nestjs/common'
import { HealthService } from '../services'
import type { HealthType } from '../types'

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): HealthType.Output {
    return this.health.live()
  }

  @Get('ready')
  ready(): Promise<HealthType.Output> {
    return this.health.ready()
  }
}
