import { Inject, Injectable } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/health'
import { READINESS } from '../tokens'
import { HealthReadinessError } from './health-readiness.error'
import { HealthStatus } from '../enums'
import type { HealthType } from '../types'

type Output = Promise<HealthType.Output>

@Injectable()
export class CheckHealthReadinessUseCase {
  constructor(@Inject(READINESS) private readonly readiness: Array<ReadinessProtocol>) {}

  async execute(): Output {
    const checks = this.readiness.map(this.ask)
    const states = await Promise.all(checks)
    const ready = states.every(this.answered)

    if (!ready) { throw new HealthReadinessError() }

    return { status: HealthStatus.READY }
  }

  private readonly ask = (readiness: ReadinessProtocol): Promise<boolean> => readiness.check()

  private readonly answered = (state: boolean): boolean => state
}
