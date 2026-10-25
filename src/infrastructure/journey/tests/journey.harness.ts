import { createConnection } from 'mongoose'
import type { Connection, Schema } from 'mongoose'
import type { MongoConnection } from '../../mongo'
import { JourneyRepository } from '../journey.repository'
import { journeyCollection, journeyModelName, journeyStepSchema } from '../journey-step.schema'

const defaultUrl = 'mongodb://127.0.0.1:27017/fortune_tiger_audit'
const unreachableUrl = 'mongodb://127.0.0.1:1/fortune_tiger_audit'
const serverSelectionTimeoutMs = 2_000
const unreachableTimeoutMs = 500

const url = (): string => process.env.MONGODB_URL ?? defaultUrl

export class JourneyHarness {
  static async open(): Promise<Connection> {
    const connection = createConnection(url(), { serverSelectionTimeoutMS: serverSelectionTimeoutMs })

    await connection.asPromise()

    return connection
  }

  static unreachable(): Connection {
    return createConnection(unreachableUrl, {
      bufferCommands: false,
      serverSelectionTimeoutMS: unreachableTimeoutMs,
    })
  }

  static repository(connection: Connection): JourneyRepository {
    const model = <Document>(name: string, schema: Schema<Document>) => connection.model<Document>(name, schema)
    const stub = { model } as unknown as MongoConnection

    return new JourneyRepository(stub)
  }

  static async sync(connection: Connection): Promise<void> {
    await connection.model(journeyModelName, journeyStepSchema).syncIndexes()
  }

  static async reset(connection: Connection): Promise<void> {
    await connection.collection(journeyCollection).deleteMany({})
  }

  static async close(connection: Connection): Promise<void> {
    await connection.close()
  }
}
