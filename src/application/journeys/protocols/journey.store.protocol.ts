import type { JourneyType } from '../types'

export interface JourneyStoreProtocol {
  record(step: JourneyType.Schema): Promise<void>
  timeline(query: JourneyType.Query): Promise<Array<JourneyType.Schema>>
}
