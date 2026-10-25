import { Inject, Injectable } from '@nestjs/common'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { uuidv7 } from 'uuidv7'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { platformProvider } from '@application/wallets'
import type { HttpType } from '../types'

const operation = 'route'
const readPrefix = 'read'
const separator = ':'

@Injectable()
export class JourneyInterceptor implements NestInterceptor {
  constructor(
    private readonly journey: JourneyService,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpType.Request>()
    const startedAt = this.clock.now()
    const flowId = request.flowId ?? `${readPrefix}${separator}${uuidv7()}`
    const providerId = request.provider?.providerId ?? platformProvider

    return next.handle().pipe(
      tap({
        next: () => this.record(flowId, request, startedAt, providerId, JourneyOutcome.SUCCEEDED),
        error: () => this.record(flowId, request, startedAt, providerId, JourneyOutcome.FAILED),
      }),
    )
  }

  private readonly record = (
    flowId: string,
    request: HttpType.Request,
    startedAt: Date,
    providerId: string,
    outcome: JourneyOutcome,
  ): void => {
    const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : undefined

    void this.journey.record({
      flowId,
      stage: JourneyStage.ROUTE,
      operation,
      outcome,
      startedAt,
      providerId,
      playerId,
      wagerId: undefined,
      walletId: undefined,
      failureCode: undefined,
    })
  }
}