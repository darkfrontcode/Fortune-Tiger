import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import type { ReadinessProtocol } from '../../../application/protocols'

const timeoutMs = 2000

type SqsClient = {
  send(command: GetQueueAttributesCommand, options?: { abortSignal?: AbortSignal }): Promise<unknown>
}

export class QueueReadiness implements ReadinessProtocol {
  constructor(
    private readonly client: SqsClient,
    private readonly queueUrl: string,
  ) {}

  async check(): Promise<boolean> {
    const command = new GetQueueAttributesCommand({ QueueUrl: this.queueUrl, AttributeNames: ['QueueArn'] })
    const abortSignal = AbortSignal.timeout(timeoutMs)

    try {
      await this.client.send(command, { abortSignal })

      return true
    } catch {
      return false
    }
  }
}
