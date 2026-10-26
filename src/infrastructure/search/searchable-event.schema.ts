import { Schema } from 'mongoose'
import type { SearchType } from '@application/searches'

export const searchableModelName = 'SearchableEvent'
export const searchableCollection = 'searchable_events'

export const searchableEventSchema = new Schema<SearchType.Schema>(
  {
    id: { type: String, required: true },
    eventType: { type: String, required: true },
    kind: { type: String, required: true },
    status: { type: String, required: true },
    failureCode: { type: String },
    text: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    providerId: { type: String, required: true },
    wagerId: { type: String },
    embedding: { type: [Number], required: true },
  },
  { collection: searchableCollection, versionKey: false, timestamps: false },
)

searchableEventSchema.index({ id: 1 }, { unique: true })
