import { Injectable } from '@nestjs/common'
import type { MetricProtocol } from '@application/observability'
import { ObservabilityType } from '../types'

type Observation = ObservabilityType.Observation

const EMPTY = 0
const EMPTY_LENGTH = 0

@Injectable()
export class SimpleMetric implements MetricProtocol {
  private readonly counts = new Map<string, number>()
  private readonly observations = new Map<string, Observation>()

  increment(name: string): void {
    const total = this.count(name) + 1

    this.counts.set(name, total)
  }

  observe(name: string, milliseconds: number): void {
    const stored = this.observations.get(name) ?? { count: EMPTY, sum: EMPTY }
    const observation = { count: stored.count + 1, sum: stored.sum + milliseconds }

    this.observations.set(name, observation)
  }

  count(name: string): number {
    return this.counts.get(name) ?? EMPTY
  }

  render(): Promise<string> {
    const counters = [...this.counts.entries()].map(
      ([name, total]) => `# TYPE ${name} counter\n${name} ${total}`,
    )
    const summaries = [...this.observations.entries()].map(
      ([name, observation]) =>
        `# TYPE ${name} summary\n${name}_count ${observation.count}\n${name}_sum ${observation.sum}`,
    )
    const lines = [...counters, ...summaries]
    const empty = lines.length === EMPTY_LENGTH
    const text = empty ? String() : `${lines.join('\n')}\n`

    return Promise.resolve(text)
  }
}
