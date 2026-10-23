import { describe, expect, it } from 'bun:test'
import { PrometheusMetric } from '../prometheus.metric'

describe('PrometheusMetric', () => {
  it('counts one increment under the name it receives', async () => {
    const metric = new PrometheusMetric()

    metric.increment('wager_transactions_processed_total')

    const text = await metric.render()

    expect(text).toContain('# TYPE wager_transactions_processed_total counter')
    expect(text).toContain('wager_transactions_processed_total 1')
  })

  it('answers the help text of the description map', async () => {
    const metric = new PrometheusMetric()

    metric.increment('wager_transactions_processed_total')

    const text = await metric.render()

    expect(text).toContain('# HELP wager_transactions_processed_total Wager transactions that ended processed')
  })

  it('observes one duration as a summary', async () => {
    const metric = new PrometheusMetric()

    metric.observe('wager_processing_milliseconds', 25)

    const text = await metric.render()

    expect(text).toContain('# TYPE wager_processing_milliseconds summary')
    expect(text).toContain('wager_processing_milliseconds_count 1')
    expect(text).toContain('wager_processing_milliseconds_sum 25')
  })

  it('answers an empty exposition before the first record', async () => {
    const metric = new PrometheusMetric()
    const text = await metric.render()

    expect(text.trim()).toBe('')
  })
})
