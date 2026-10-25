import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common'
import type { LoggerProtocol } from '@application/observability'
import { LOGGER } from '@application/observability'
import { AuditSqsConsumer, OutboxWorker, SqsConsumer } from '@infrastructure/messaging'
import { ReferenceWorker } from '@infrastructure/persistence'

@Injectable()
export class RuntimeService implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    private readonly outbox: OutboxWorker,
    private readonly reference: ReferenceWorker,
    private readonly consumer: SqsConsumer,
    private readonly audit: AuditSqsConsumer,
    private readonly orm: MikroORM,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
  ) {}

  onApplicationBootstrap(): void {
    this.outbox.open()
    this.reference.open()
    this.consumer.open()
    this.audit.open()
  }

  async onApplicationShutdown(): Promise<void> {
    await this.attempt(() => this.outbox.close())
    await this.attempt(() => this.reference.close())
    await this.attempt(() => this.consumer.close())
    await this.attempt(() => this.audit.close())
    await this.attempt(() => this.orm.close(true))
  }

  private readonly attempt = async (step: () => void | Promise<void>): Promise<void> => {
    try {
      await step()
    } catch (error) {
      this.fail(error)
    }
  }

  private readonly fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.warn(message)
  }
}
