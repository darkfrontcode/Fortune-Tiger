import { Inject, Injectable } from '@nestjs/common'
import type { OnApplicationShutdown } from '@nestjs/common'
import { createConnection } from 'mongoose'
import type { Connection, Model, Schema } from 'mongoose'
import type { LoggerProtocol } from '@application/observability'
import { LOGGER } from '@application/observability'
import { Environment } from '../environment'

const serverSelectionTimeoutMs = 2_000
const connectTimeoutMs = 2_000
const options = {
  bufferCommands: false,
  serverSelectionTimeoutMS: serverSelectionTimeoutMs,
  connectTimeoutMS: connectTimeoutMs,
}

@Injectable()
export class MongoConnection implements OnApplicationShutdown {
  private readonly connection: Connection
  private readonly logger: LoggerProtocol

  constructor(environment: Environment, @Inject(LOGGER) logger: LoggerProtocol) {
    this.logger = logger
    this.connection = createConnection(environment.mongoUrl, options)
    this.connection.on('error', this.fail)
  }

  model<Document>(name: string, schema: Schema<Document>): Model<Document> {
    return this.connection.model<Document>(name, schema)
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close()
  }

  private readonly fail = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)

    this.logger.warn(message)
  }
}
