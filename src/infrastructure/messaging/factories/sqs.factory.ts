import { SQSClient } from '@aws-sdk/client-sqs'

const defaultRegion = 'us-east-1'
const defaultAccessKey = 'test'
const defaultSecretKey = 'test'
const maxAttempts = 1

export const createSqsClient = (): SQSClient => {
  const region = process.env.AWS_REGION ?? defaultRegion
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? defaultAccessKey
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? defaultSecretKey

  return new SQSClient({
    region,
    endpoint: process.env.AWS_ENDPOINT_URL,
    maxAttempts,
    credentials: { accessKeyId, secretAccessKey },
  })
}
