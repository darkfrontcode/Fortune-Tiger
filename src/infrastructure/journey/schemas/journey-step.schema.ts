import { Schema } from 'mongoose'
import type { JourneyType } from '@application/journeys'

export const journeyModelName = 'JourneyStep'
export const journeyCollection = 'journey_steps'

export const journeyStepSchema = new Schema<JourneyType.Schema>(
  {
    stepId: { type: String, required: true },
    flowId: { type: String, required: true },
    stage: { type: String, required: true },
    operation: { type: String, required: true },
    outcome: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    providerId: { type: String },
    playerId: { type: String },
    wagerId: { type: String },
    walletId: { type: String },
    failureCode: { type: String },
  },
  { collection: journeyCollection, versionKey: false, timestamps: false },
)

journeyStepSchema.index({ stepId: 1 }, { unique: true })
journeyStepSchema.index({ flowId: 1, occurredAt: 1, stepId: 1 })
journeyStepSchema.index({ providerId: 1, playerId: 1, occurredAt: 1, stepId: 1 })
journeyStepSchema.index({ providerId: 1, occurredAt: 1, stepId: 1 })
