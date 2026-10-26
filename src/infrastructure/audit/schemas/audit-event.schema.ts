import { Schema } from 'mongoose'
import type { AuditType } from '@application/audits'

export const auditModelName = 'AuditEvent'
export const auditCollection = 'audit_events'

const actor = new Schema<AuditType.Actor>(
  {
    type: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false },
)

export const auditEventSchema = new Schema<AuditType.Event>(
  {
    eventId: { type: String, required: true },
    eventType: { type: String, required: true },
    eventVersion: { type: Number, required: true },
    occurredAt: { type: Date, required: true },
    recordedAt: { type: Date, required: true },
    wagerId: { type: String },
    correlationId: { type: String, required: true },
    causationId: { type: String },
    source: { type: String, required: true },
    actor: { type: actor, required: false },
    metadata: { type: Schema.Types.Mixed, required: true },
  },
  { collection: auditCollection, versionKey: false, timestamps: false },
)

auditEventSchema.index({ eventId: 1 }, { unique: true })
auditEventSchema.index({ wagerId: 1, occurredAt: 1, eventId: 1 })
auditEventSchema.index({ correlationId: 1, occurredAt: 1, eventId: 1 })
auditEventSchema.index({ eventType: 1, occurredAt: 1, eventId: 1 })
