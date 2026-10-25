import { SQSClient } from '@aws-sdk/client-sqs'
import { Inject, Injectable } from '@nestjs/common'
import { AUDIT_QUEUE_CONFIG } from '../factories'
import { SqsQueue } from './sqs.queue'
import type { ConsumerType } from './types'

@Injectable()
export class AuditQueue extends SqsQueue {
  constructor(
    @Inject(SQSClient) client: SQSClient,
    @Inject(AUDIT_QUEUE_CONFIG) config: ConsumerType.Config,
  ) {
    super(client, config)
  }
}
