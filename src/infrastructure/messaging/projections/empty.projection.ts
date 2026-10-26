import type { WagerProjectionProtocol } from './wager.projection.protocol'
import type { WagerProjectionType } from './types'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

export class EmptyProjection implements WagerProjectionProtocol {
  project(_input: Input): Output {
    return []
  }
}
