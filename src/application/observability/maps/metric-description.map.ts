import { metricNames } from '../data'

export class MetricDescriptionMap extends Map<string, string> {
  constructor() {
    super([
      [
        metricNames.reconciliationDivergence,
        'Wallets whose stored balance diverges from the ledger',
      ],
      [metricNames.transactionPending, 'Wager transactions left pending'],
      [metricNames.transactionPendingReference, 'Wager transactions waiting for a reference'],
      [metricNames.transactionProcessed, 'Wager transactions that ended processed'],
      [metricNames.transactionRejected, 'Wager transactions rejected by a business rule'],
      [metricNames.transactionFailed, 'Wager transactions that ended failed'],
      [metricNames.duplicate, 'Replays answered for an idempotency key already stored'],
      [metricNames.consumerRetry, 'Queue deliveries scheduled for another attempt'],
      [metricNames.consumerDeadLetter, 'Queue deliveries sent to the dead-letter queue'],
      [metricNames.lockConflict, 'Wallet lock timeouts and deadlocks'],
      [metricNames.outboxLag, 'Age of an outbox row when it is published, in milliseconds'],
      [metricNames.transactionLatency, 'Wager processing duration in milliseconds'],
      [metricNames.auditPersisted, 'Audit events stored in MongoDB'],
      [metricNames.auditDuplicate, 'Audit events already stored, answered as a duplicate'],
      [metricNames.auditFailure, 'Audit writes that failed and will be retried'],
      [metricNames.journeyRecorded, 'Journey steps stored in MongoDB'],
      [metricNames.journeyFailure, 'Journey steps that could not be stored'],
      [metricNames.publishCount, 'Events sent to the outbound queue'],
      [metricNames.publishDuration, 'Outbound publish duration in milliseconds'],
    ])
  }
}
