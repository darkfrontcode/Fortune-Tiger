import { SQSClient } from '@aws-sdk/client-sqs'
import type { Environment } from '../../environment'

const maxAttempts = 1

export const createSqsClient = (environment: Environment): SQSClient =>
  new SQSClient({
    region: environment.region,
    endpoint: environment.endpoint,
    maxAttempts,
    credentials: {
      accessKeyId: environment.accessKeyId,
      secretAccessKey: environment.secretAccessKey,
    },
  })
