import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/protocols'
import { READINESS } from '@application/tokens'
import { HealthStatus } from '../enums'
import type { HealthType } from '../types'

@Injectable()
export class HealthService {
  constructor(@Inject(READINESS) private readonly readiness: Array<ReadinessProtocol>) {}

  live(): HealthType.Output {
    return { status: HealthStatus.LIVE }
  }

  async ready(): Promise<HealthType.Output> {
    const states = await Promise.all(this.readiness.map(this.ask))
    const ready = states.every(this.answered)

    if (!ready) {
      throw new ServiceUnavailableException({ status: HealthStatus.UNAVAILABLE })
    }

    return { status: HealthStatus.READY }
  }

  private readonly ask = (readiness: ReadinessProtocol): Promise<boolean> => readiness.check()

  private readonly answered = (state: boolean): boolean => state
}
