import { Injectable } from '@nestjs/common'
import { HealthStatus } from '../enums'
import type { HealthType } from '../types'

type Output = HealthType.Output

@Injectable()
export class CheckHealthLivenessUseCase {
  execute(): Output {
    return { status: HealthStatus.LIVE }
  }
}
