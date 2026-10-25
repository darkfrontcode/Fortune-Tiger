import { Injectable } from '@nestjs/common'
import { collectDefaultMetrics, Counter, Registry, Summary } from 'prom-client'
import { MetricDescriptionMap } from '@application/observability'
import type { MetricProtocol } from '@application/observability'

const percentiles = [0.5, 0.9, 0.99]

@Injectable()
export class PrometheusMetric implements MetricProtocol {
  private readonly registry = new Registry()
  private readonly descriptions = new MetricDescriptionMap()
  private readonly counters = new Map<string, Counter>()
  private readonly summaries = new Map<string, Summary>()

  constructor() {
    collectDefaultMetrics({ register: this.registry, labels: {} })
  }

  increment(name: string): void {
    this.counter(name).inc()
  }

  observe(name: string, milliseconds: number): void {
    this.summary(name).observe(milliseconds)
  }

  render(): Promise<string> {
    return this.registry.metrics()
  }

  private counter(name: string): Counter {
    const stored = this.counters.get(name)

    if (stored !== undefined) { return stored }

    const counter = new Counter({ name, help: this.help(name), registers: [this.registry] })

    this.counters.set(name, counter)

    return counter
  }

  private summary(name: string): Summary {
    const stored = this.summaries.get(name)

    if (stored !== undefined) { return stored }

    const summary = new Summary({
      name,
      help: this.help(name),
      percentiles,
      registers: [this.registry],
    })

    this.summaries.set(name, summary)

    return summary
  }

  private help(name: string): string {
    return this.descriptions.get(name) ?? name
  }
}
