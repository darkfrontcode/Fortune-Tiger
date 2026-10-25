import type { AuditType } from '@application/audits'
import { INVALID_AUDIT_EVENT_MESSAGE } from './data'

type Data = Record<string, unknown>

type Envelope = {
  eventId?: unknown
  eventType?: unknown
  version?: unknown
  occurredAt?: unknown
  correlationId?: unknown
  causationId?: unknown
  data?: unknown
}

const source = 'fortune-tiger'
const providerActor = 'provider'
const statusField = 'status'
const kindField = 'kind'
const directionField = 'direction'
const zero = 0
const firstVersion = 1

const fail = (): never => {
  throw new Error(INVALID_AUDIT_EVENT_MESSAGE)
}

const object = (value: unknown): Data => {
  const valid = typeof value === 'object' && value !== null && !Array.isArray(value)

  if (!valid) { return fail() }

  return value as Data
}

const text = (value: unknown): string => {
  const valid = typeof value === 'string' && value.length > zero

  if (!valid) { return fail() }

  return value
}

const optionalText = (value: unknown): string | undefined => {
  const absent = value === undefined

  if (absent) { return undefined }

  return text(value)
}

const version = (value: unknown): number => {
  const valid = typeof value === 'number' && Number.isInteger(value) && value >= firstVersion

  if (!valid) { return fail() }

  return value
}

const date = (value: unknown): Date => {
  const parsed = new Date(text(value))
  const invalid = Number.isNaN(parsed.getTime())

  if (invalid) { return fail() }

  return parsed
}

const actor = (data: Data): AuditType.Actor | undefined => {
  const id = optionalText(data.providerId)
  const absent = id === undefined

  if (absent) { return undefined }

  return { type: providerActor, id }
}

const metadata = (data: Data): Record<string, string> => {
  const fields = [statusField, kindField, directionField]
  const collected: Record<string, string> = {}
  const collect = (field: string) => {
    const value = data[field]
    const valid = typeof value === 'string' && value.length > zero

    if (!valid) { return }

    collected[field] = value
  }

  fields.forEach(collect)

  return collected
}

const parse = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    return fail()
  }
}

export class AuditEventGuard {
  static from(body: string, recordedAt: Date): AuditType.Event {
    const envelope: Envelope = object(parse(body))
    const data = object(envelope.data)

    return {
      eventId: text(envelope.eventId),
      eventType: text(envelope.eventType),
      eventVersion: version(envelope.version),
      occurredAt: date(envelope.occurredAt),
      recordedAt,
      wagerId: optionalText(data.transactionId),
      correlationId: text(envelope.correlationId),
      causationId: optionalText(envelope.causationId),
      source,
      actor: actor(data),
      metadata: metadata(data),
    }
  }
}
