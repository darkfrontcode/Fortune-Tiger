import { describe, expect, test } from 'bun:test'
import { ServiceUnavailableException } from '@nestjs/common'
import type { ReadinessProtocol, TheoryProtocol } from '@application/protocols'
import { HealthStatus } from '../enums'
import { HealthService } from '../services'

type Params = {
  answers: Array<boolean>
}

interface HealthTheory extends TheoryProtocol<Params> {
  title: string
  description: string
}

const answered = (answer: boolean): ReadinessProtocol => ({ check: () => Promise.resolve(answer) })

const opened = (answers: Array<boolean>): HealthService => new HealthService(answers.map(answered))

const settled = (service: HealthService): Promise<boolean> => service.ready().then(() => true, () => false)

describe('HealthService', () => {
  test('WHEN liveness is asked SHOULD answer live', () => {
    const service = opened([])
    const status = service.live().status

    expect(status).toBe(HealthStatus.LIVE)
  })

  const theories: HealthTheory[] = [
    {
      title: 'both dependencies reachable',
      description: 'WHEN Postgres and SQS answer SHOULD be ready',
      params: { answers: [true, true] },
      expected: true,
    },
    {
      title: 'Postgres down',
      description: 'WHEN Postgres fails SHOULD be unavailable',
      params: { answers: [false, true] },
      expected: false,
    },
    {
      title: 'SQS down',
      description: 'WHEN SQS fails SHOULD be unavailable',
      params: { answers: [true, false] },
      expected: false,
    },
  ]

  const prove = async ({ params, expected }: HealthTheory) => {
    const service = opened(params.answers)
    const ready = await settled(service)

    expect(ready).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)

  test('WHEN a dependency is down SHOULD refuse with 503', async () => {
    const service = opened([false])
    const thrown = await service.ready().catch((error: unknown) => error)
    const refused = thrown instanceof ServiceUnavailableException

    expect(refused).toBe(true)
  })
})
