import { describe, expect, test } from 'bun:test'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import type { CallHandler } from '@nestjs/common'
import { firstValueFrom, of, throwError } from 'rxjs'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { JourneyStoreProtocol, JourneyType } from '@application/journeys'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { platformProvider } from '@application/wallets'
import type { HttpType } from '../types'
import { JourneyInterceptor } from '../interceptors'

const instant = new Date('2026-01-01T00:00:00.000Z')

class JourneyStore implements JourneyStoreProtocol {
  readonly steps: Array<JourneyType.Schema> = []

  record(step: JourneyType.Schema): Promise<void> {
    this.steps.push(step)

    return Promise.resolve()
  }

  timeline(): Promise<Array<JourneyType.Schema>> {
    return Promise.resolve(this.steps)
  }
}

class Logger implements LoggerProtocol {
  warn(): void {}
}

class Metric implements MetricProtocol {
  increment(): void {}

  observe(): void {}

  render(): Promise<string> {
    return Promise.resolve(String())
  }
}

class Clock implements ClockProtocol {
  now(): Date {
    return instant
  }
}

const journey = (store: JourneyStore) => new JourneyService(store, new Clock(), new Logger(), new Metric())

const interceptor = (store: JourneyStore) => new JourneyInterceptor(journey(store), new Clock())

const requestOf = (flowId: string | undefined): HttpType.Request => ({
  body: { playerId: 'player-1' },
  headers: {},
  provider: { providerId: 'provider-a' },
  flowId,
})

const contextOf = (request: HttpType.Request) => new ExecutionContextHost([request, {}, undefined])

describe('JourneyInterceptor', () => {
  test('WHEN a route resolves SHOULD record a succeeded route step with the router flow', async () => {
    const store = new JourneyStore()
    const request = requestOf('provider-a:ext-1')
    const handler: CallHandler = {
      handle: () => of('ok'),
    }

    await firstValueFrom(interceptor(store).intercept(contextOf(request), handler))

    expect(store.steps).toHaveLength(1)
    const step = store.steps[0]

    expect(step?.flowId).toBe('provider-a:ext-1')
    expect(step?.stage).toBe(JourneyStage.ROUTE)
    expect(step?.operation).toBe('route')
    expect(step?.outcome).toBe(JourneyOutcome.SUCCEEDED)
    expect(step?.providerId).toBe('provider-a')
    expect(step?.playerId).toBe('player-1')
  })

  test('WHEN a route carries no flow SHOULD fall back to a read flow', async () => {
    const store = new JourneyStore()
    const request = requestOf(undefined)
    const handler: CallHandler = {
      handle: () => of('ok'),
    }

    await firstValueFrom(interceptor(store).intercept(contextOf(request), handler))

    expect(store.steps[0]?.flowId).toMatch(/^read:/)
    expect(store.steps[0]?.outcome).toBe(JourneyOutcome.SUCCEEDED)
  })

  test('WHEN no provider identity exists SHOULD mark the flow as the platform provider', async () => {
    const store = new JourneyStore()
    const request = requestOf(undefined)
    request.provider = undefined
    const handler: CallHandler = {
      handle: () => of('ok'),
    }

    await firstValueFrom(interceptor(store).intercept(contextOf(request), handler))

    expect(store.steps[0]?.providerId).toBe(platformProvider)
  })

  test('WHEN a route throws SHOULD record a failed route step and rethrow', async () => {
    const store = new JourneyStore()
    const request = requestOf('provider-a:ext-1')
    const handler: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    }

    await expect(firstValueFrom(interceptor(store).intercept(contextOf(request), handler))).rejects.toThrow('boom')

    expect(store.steps[0]?.outcome).toBe(JourneyOutcome.FAILED)
    expect(store.steps[0]?.flowId).toBe('provider-a:ext-1')
  })
})