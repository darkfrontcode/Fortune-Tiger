import type { ClockProtocol } from '@application/time'
import type { JourneyService } from '@application/journeys'

export const clock: ClockProtocol = { now: () => new Date() }

export const journey = { record: () => Promise.resolve() } as unknown as JourneyService
