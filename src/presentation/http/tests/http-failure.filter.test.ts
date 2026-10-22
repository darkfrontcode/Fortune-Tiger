import { describe, expect, test } from 'bun:test'
import { HttpStatus } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import type { LoggerProtocol } from '@application/protocols'
import { HealthReadinessError, HealthStatus } from '@application/health'
import { WalletNotFoundError } from '@application/wallets'
import { WalletReconciliationNotFoundError } from '@application/reconciliations'
import { WagerNotFoundError } from '@application/transactions'
import { INFRASTRUCTURE_FAILURE_MESSAGE } from '../data'
import type { HttpType } from '../types'
import { HttpFailureFilter } from '../filters'

class Response implements HttpType.Response {
  statusCode = HttpStatus.OK
  body: unknown

  status(code: number): HttpType.Response {
    this.statusCode = code

    return this
  }

  json(body: unknown): void {
    this.body = body
  }
}

class Logger implements LoggerProtocol {
  readonly warnings: Array<string> = []

  warn(message: string): void {
    this.warnings.push(message)
  }
}

const infrastructureError = 'Database unavailable.'

describe('HttpFailureFilter', () => {
  test('wallet not found - WHEN the lookup error is thrown SHOULD answer 404', () => {
    const response = new Response()
    const host = new ExecutionContextHost([undefined, response, undefined])
    const logger = new Logger()
    const filter = new HttpFailureFilter(logger)
    const error = new WalletNotFoundError()

    filter.catch(error, host)

    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(response.body).toBe(error.message)
    expect(logger.warnings).toHaveLength(0)
  })

  test('wager not found - WHEN the lookup error is thrown SHOULD answer 404', () => {
    const response = new Response()
    const host = new ExecutionContextHost([undefined, response, undefined])
    const logger = new Logger()
    const filter = new HttpFailureFilter(logger)
    const error = new WagerNotFoundError()

    filter.catch(error, host)

    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(response.body).toBe(error.message)
    expect(logger.warnings).toHaveLength(0)
  })

  test('reconciliation wallet missing - WHEN the wallet is absent SHOULD preserve its result body', () => {
    const response = new Response()
    const host = new ExecutionContextHost([undefined, response, undefined])
    const logger = new Logger()
    const filter = new HttpFailureFilter(logger)
    const walletId = 'wallet-1'
    const error = new WalletReconciliationNotFoundError(walletId)

    filter.catch(error, host)

    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND)
    expect(response.body).toEqual({ walletId, failureCode: error.failureCode })
    expect(logger.warnings).toHaveLength(0)
  })

  test('readiness failure - WHEN a dependency is unavailable SHOULD answer 503', () => {
    const response = new Response()
    const host = new ExecutionContextHost([undefined, response, undefined])
    const logger = new Logger()
    const filter = new HttpFailureFilter(logger)

    filter.catch(new HealthReadinessError(), host)

    expect(response.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE)
    expect(response.body).toEqual({ status: HealthStatus.UNAVAILABLE })
    expect(logger.warnings).toHaveLength(0)
  })

  test('unknown error - WHEN the error is not an HTTP or application error SHOULD answer 503', () => {
    const response = new Response()
    const host = new ExecutionContextHost([undefined, response, undefined])
    const logger = new Logger()
    const filter = new HttpFailureFilter(logger)

    filter.catch(new Error(infrastructureError), host)

    expect(response.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE)
    expect(response.body).toEqual({ message: INFRASTRUCTURE_FAILURE_MESSAGE })
    expect(logger.warnings).toEqual([infrastructureError])
  })
})
