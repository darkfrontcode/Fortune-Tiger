const defaultPort = 3000
const defaultRegion = 'us-east-1'
const defaultAccessKey = 'test'
const defaultSecretKey = 'test'
const empty = String()

export class Environment {
  get port(): number {
    return Number(process.env.PORT ?? defaultPort)
  }

  get pretty(): boolean {
    return process.env.LOG_PRETTY === 'true'
  }

  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL
  }

  get region(): string {
    return process.env.AWS_REGION ?? defaultRegion
  }

  get endpoint(): string | undefined {
    return process.env.AWS_ENDPOINT_URL
  }

  get accessKeyId(): string {
    return process.env.AWS_ACCESS_KEY_ID ?? defaultAccessKey
  }

  get secretAccessKey(): string {
    return process.env.AWS_SECRET_ACCESS_KEY ?? defaultSecretKey
  }

  get queueUrl(): string {
    return process.env.SQS_QUEUE_URL ?? empty
  }

  get deadLetterQueueUrl(): string {
    return process.env.SQS_DEAD_LETTER_QUEUE_URL ?? empty
  }
}
