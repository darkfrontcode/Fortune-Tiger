import { Injectable } from '@nestjs/common'
import type { MetricProtocol } from '@application/protocols'

@Injectable()
export class SimpleMetric implements MetricProtocol {
  private readonly counts = new Map<string, number>()

  increment(name: string): void {
    const total = this.counts.get(name) ?? 0

    this.counts.set(name, total + 1)
  }

  count(name: string): number {
    return this.counts.get(name) ?? 0
  }
}
