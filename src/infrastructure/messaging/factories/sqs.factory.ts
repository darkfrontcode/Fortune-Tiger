import { SQSClient } from '@aws-sdk/client-sqs'
import { Injectable } from '@nestjs/common'
import type { Environment } from '../../environment'
import type { FactoryProtocol } from '../../protocols'

const maxAttempts = 1

@Injectable()
export class SqsFactory implements FactoryProtocol<SQSClient> {
  constructor(private readonly environment: Environment) {}

  create(): SQSClient {
    return new SQSClient({
      region: this.environment.region,
      endpoint: this.environment.endpoint,
      maxAttempts,
      credentials: {
        accessKeyId: this.environment.accessKeyId,
        secretAccessKey: this.environment.secretAccessKey,
      },
    })
  }
}
