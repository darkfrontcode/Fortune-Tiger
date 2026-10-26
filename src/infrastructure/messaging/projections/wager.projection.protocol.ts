import type { WagerProjectionType } from './types'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

export interface WagerProjectionProtocol {
  project(input: Input): Output
}
