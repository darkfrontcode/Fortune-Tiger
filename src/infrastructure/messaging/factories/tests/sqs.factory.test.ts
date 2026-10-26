import { describe, expect, test } from 'bun:test'
import { Environment } from '../../../environment'
import { SqsFactory } from '../sqs.factory'

describe('SqsFactory', () => {
  test('WHEN the environment is set SHOULD build an SQS client', () => {
    const environment = new Environment()
    const client = new SqsFactory(environment).create()

    expect(client).toBeDefined()
  })
})
