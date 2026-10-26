import { Injectable } from '@nestjs/common'
import { WagerTransactionStatus } from '@domain/wager/enums'
import {
  EmptyProjection,
  PendingReferenceProjection,
  ProcessedProjection,
  RejectedProjection,
  WagerProjectionProtocol,
  WagerProjectionType,
} from '../projections'
import type { MapperProtocol } from './mapper.protocol'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

const projections = new Map<WagerTransactionStatus, WagerProjectionProtocol>([
  [WagerTransactionStatus.REJECTED, new RejectedProjection()],
  [WagerTransactionStatus.PENDING_REFERENCE, new PendingReferenceProjection()],
  [WagerTransactionStatus.PROCESSED, new ProcessedProjection()],
])

@Injectable()
export class WagerEventsMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const projection = projections.get(input.wager.status)

    if (projection === undefined) { return new EmptyProjection().project(input) }

    return projection.project(input)
  }
}
