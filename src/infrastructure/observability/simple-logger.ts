import type { LoggerProtocol } from '../../application/protocols'
import { ObservabilityType } from './types'

type Context = ObservabilityType.Context
type Input = ObservabilityType.Input
type Output = ObservabilityType.Output
type Schema = ObservabilityType.Schema
type KeyValue = [string, string | undefined]

const text = {
  field: '=',
  space: ' ',
  line: '\n',
}

const levels = {
  warn: 'WARN',
}

export class SimpleLogger implements LoggerProtocol {
  private constructor(private readonly schema: Schema) {}

  static open(input: Input): SimpleLogger {
    const schema: Schema = { ...input, context: {} }

    return new SimpleLogger(schema)
  }

  child(context: Context): SimpleLogger {
    const byFilled = ([, value]: KeyValue) => value !== undefined
    const keyValues = Object.entries(context)
    const attached = Object.fromEntries(keyValues.filter(byFilled))
    const merged = { ...this.schema.context, ...attached }
    const schema: Schema = { ...this.schema, context: merged }

    return new SimpleLogger(schema)
  }

  warn(message: string): void {
    const time = this.schema.clock.now().toISOString()
    const context = this.schema.context
    const output: Output = { time, level: levels.warn, message, ...context }
    const line = this.schema.pretty ? this.toPretty(output) : this.toJSON(output)

    process.stdout.write(line + text.line)
  }

  private toJSON(output: Output): string {
    return JSON.stringify(output)
  }

  private toPretty(output: Output): string {
    const { time, level, message, ...context } = output
    const byFilled = ([, value]: KeyValue) => value !== undefined
    const toField = ([key, value]: KeyValue) => `${key}${text.field}${value}`
    const keyValues = Object.entries(context)
    const fields = keyValues.filter(byFilled).map(toField)
    const parts = [time, level, message, ...fields]

    return parts.join(text.space)
  }
}
