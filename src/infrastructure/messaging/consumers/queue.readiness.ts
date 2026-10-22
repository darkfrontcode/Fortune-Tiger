import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs'
import { Inject, Injectable } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/health'
import { QUEUE_CONFIG } from '../factories'
import type { ConsumerType } from './types'

const timeoutMs = 2000

type SqsClient = {
  send(command: GetQueueAttributesCommand, options?: { abortSignal?: AbortSignal }): Promise<unknown>
}

@Injectable()
export class QueueReadiness implements ReadinessProtocol {
  constructor(
    @Inject(SQSClient) private readonly client: SqsClient,
    @Inject(QUEUE_CONFIG) private readonly config: ConsumerType.Config,
  ) {}

  async check(): Promise<boolean> {
    const queueUrl = this.config.queueUrl
    const command = new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ['QueueArn'] })
    const abortSignal = AbortSignal.timeout(timeoutMs)

    try {
      await this.client.send(command, { abortSignal })

      return true
    } catch {
      return false
    }
  }
}
