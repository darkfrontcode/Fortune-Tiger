import { describe, expect, it } from 'bun:test'
import { SimpleMetric } from '../simple.metric'

describe('SimpleMetric', () => {
  it('counts one increment under the name it receives', () => {
    const metric = new SimpleMetric()

    metric.increment('consumer_retries_total')

    expect(metric.count('consumer_retries_total')).toBe(1)
  })

  it('answers zero for a name without a record', () => {
    const metric = new SimpleMetric()

    expect(metric.count('consumer_retries_total')).toBe(0)
  })

  it('renders a counter with its type', async () => {
    const metric = new SimpleMetric()

    metric.increment('consumer_retries_total')
    metric.increment('consumer_retries_total')

    const text = await metric.render()

    expect(text).toBe('# TYPE consumer_retries_total counter\nconsumer_retries_total 2\n')
  })

  it('renders an observation as count and sum', async () => {
    const metric = new SimpleMetric()

    metric.observe('outbox_lag_milliseconds', 15)
    metric.observe('outbox_lag_milliseconds', 5)

    const text = await metric.render()

    expect(text).toContain('# TYPE outbox_lag_milliseconds summary')
    expect(text).toContain('outbox_lag_milliseconds_count 2')
    expect(text).toContain('outbox_lag_milliseconds_sum 20')
  })

  it('renders nothing before the first record', async () => {
    const metric = new SimpleMetric()

    expect(await metric.render()).toBe('')
  })
})
