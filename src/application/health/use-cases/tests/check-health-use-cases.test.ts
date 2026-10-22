import { describe, expect, test } from 'bun:test'
import type { ReadinessProtocol } from '../../../protocols'
import { HealthStatus } from '../../enums'
import { CheckHealthLivenessUseCase } from '../check-health-liveness.use-case'
import { CheckHealthReadinessUseCase } from '../check-health-readiness.use-case'
import { HealthReadinessError } from '../health-readiness.error'

describe('Health use cases', () => {
  test('reports liveness without checking dependencies', () => {
    const useCase = new CheckHealthLivenessUseCase()
    const output = useCase.execute()

    expect(output).toEqual({ status: HealthStatus.LIVE })
  })

  test('reports readiness when every probe succeeds', async () => {
    const readiness: Array<ReadinessProtocol> = [
      { check: async () => true },
      { check: async () => true },
    ]
    const useCase = new CheckHealthReadinessUseCase(readiness)
    const output = await useCase.execute()

    expect(output).toEqual({ status: HealthStatus.READY })
  })

  test('throws when a dependency probe fails', async () => {
    const readiness: Array<ReadinessProtocol> = [
      { check: async () => true },
      { check: async () => false },
    ]
    const useCase = new CheckHealthReadinessUseCase(readiness)
    const output = useCase.execute()

    await expect(output).rejects.toBeInstanceOf(HealthReadinessError)
  })
})
