import type { AuditType } from '@application/audits'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = AuditType.Event
type Output = HttpType.AuditEventOutput

const actor = (value: AuditType.Actor | undefined): HttpType.AuditActorOutput | undefined => {
  const absent = value === undefined

  if (absent) { return undefined }

  return { type: value.type, id: value.id }
}

export class AuditOutputMapper implements MapperProtocol<Input, Output> {
  map(event: Input): Output {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      wagerId: event.wagerId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      source: event.source,
      actor: actor(event.actor),
      metadata: event.metadata,
    }
  }
}
