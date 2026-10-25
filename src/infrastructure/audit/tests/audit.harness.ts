import { createConnection } from 'mongoose'
import type { Connection, Schema } from 'mongoose'
import { AuditEventRepository } from '../audit-event.repository'
import { auditCollection, auditEventSchema, auditModelName } from '../audit-event.schema'
import type { MongoConnection } from '../../mongo'

const defaultUrl = 'mongodb://127.0.0.1:27017/fortune_tiger_audit'
const unreachableUrl = 'mongodb://127.0.0.1:1/fortune_tiger_audit'
const serverSelectionTimeoutMs = 2_000
const unreachableTimeoutMs = 500

const url = (): string => process.env.MONGODB_URL ?? defaultUrl

export class AuditHarness {
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

  static repository(connection: Connection): AuditEventRepository {
    const model = <Document>(name: string, schema: Schema<Document>) => connection.model<Document>(name, schema)
    const stub = { model } as unknown as MongoConnection

    return new AuditEventRepository(stub)
  }

  static async sync(connection: Connection): Promise<void> {
    await connection.model(auditModelName, auditEventSchema).syncIndexes()
  }

  static async reset(connection: Connection): Promise<void> {
    await connection.collection(auditCollection).deleteMany({})
  }

  static async close(connection: Connection): Promise<void> {
    await connection.close()
  }
}
