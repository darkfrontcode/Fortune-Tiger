import { CreateQueueCommand, DeleteQueueCommand, SQSClient } from '@aws-sdk/client-sqs'
import { Pool } from 'pg'

const defaultRegion = 'us-east-1'
const defaultCredential = 'test'
const fifo = 'true'
const eventPrefix = 'wager-events-audit-e2e'
const deadLetterPrefix = 'wager-events-audit-e2e-dlq'
const suffix = '.fifo'
const pendingOutbox = 'delete from outbox_messages where published_at is null'

const client = (): SQSClient =>
  new SQSClient({
    region: process.env.AWS_REGION ?? defaultRegion,
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? defaultCredential,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? defaultCredential,
    },
    maxAttempts: 1,
  })

const create = async (sqs: SQSClient, name: string): Promise<string> => {
  const output = await sqs.send(
    new CreateQueueCommand({ QueueName: name, Attributes: { FifoQueue: fifo } }),
  )

  return output.QueueUrl ?? String()
}

const remove = async (sqs: SQSClient, url: string): Promise<void> => {
  await sqs.send(new DeleteQueueCommand({ QueueUrl: url }))
}

export class AuditChannel {
  private constructor(
    private readonly sqs: SQSClient,
    private readonly database: Pool,
    private readonly events: string,
    private readonly deadLetter: string,
    private readonly previousEvents: string | undefined,
    private readonly previousDeadLetter: string | undefined,
  ) {}

  static async open(): Promise<AuditChannel> {
    const sqs = client()
    const stamp = Date.now()
    const events = await create(sqs, `${eventPrefix}-${stamp}${suffix}`)
    const deadLetter = await create(sqs, `${deadLetterPrefix}-${stamp}${suffix}`)
    const database = new Pool({ connectionString: process.env.DATABASE_URL })
    const previousEvents = process.env.SQS_EVENTS_QUEUE_URL
    const previousDeadLetter = process.env.SQS_EVENTS_DEAD_LETTER_QUEUE_URL

    await database.query(pendingOutbox)
    process.env.SQS_EVENTS_QUEUE_URL = events
    process.env.SQS_EVENTS_DEAD_LETTER_QUEUE_URL = deadLetter

    return new AuditChannel(sqs, database, events, deadLetter, previousEvents, previousDeadLetter)
  }

  async close(): Promise<void> {
    this.restore()
    await remove(this.sqs, this.events)
    await remove(this.sqs, this.deadLetter)
    await this.database.end()
    this.sqs.destroy()
  }

  private restore(): void {
    this.assign('SQS_EVENTS_QUEUE_URL', this.previousEvents)
    this.assign('SQS_EVENTS_DEAD_LETTER_QUEUE_URL', this.previousDeadLetter)
  }

  private assign(name: string, value: string | undefined): void {
    if (value === undefined) {
      delete process.env[name]

      return
    }

    process.env[name] = value
  }
}
