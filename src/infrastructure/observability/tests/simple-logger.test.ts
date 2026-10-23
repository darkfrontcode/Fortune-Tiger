import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'

import type { ClockProtocol } from '@application/time'
import { SimpleLogger } from '../simple-logger'

const instant = {
  time: new Date('2026-01-01T00:00:00.000Z'),
}

const ids = {
  correlation: 'correlation-id',
  message: 'message-id',
  transaction: 'transaction-id',
  wallet: 'wallet-id',
  provider: 'provider-id',
}

const text = {
  message: 'wallet divergence',
  level: 'WARN',
  line: '\n',
}

const EMPTY_NUMBER = 0

class FixedClock implements ClockProtocol {
  now(): Date {
    return instant.time
  }
}

describe('SimpleLogger', () => {
  const clock = new FixedClock()
  const written: string[] = []

  const capture = () => {
    const writer = spyOn(process.stdout, 'write')

    writer.mockImplementation((chunk) => {
      written.push(String(chunk))

      return true
    })
  }

  beforeEach(() => {
    written.length = EMPTY_NUMBER
  })

  afterEach(() => {
    mock.restore()
  })

  it('writes one JSON line with the child identifiers', () => {
    capture()

    const logger = SimpleLogger.open({ clock, pretty: false })
    const child = logger.child({
      correlationId: ids.correlation,
      walletId: ids.wallet,
    })

    child.warn(text.message)

    const [line] = written
    const output = JSON.parse(String(line))
    const expected = {
      time: instant.time.toISOString(),
      level: text.level,
      message: text.message,
      correlationId: ids.correlation,
      walletId: ids.wallet,
    }

    expect(output).toEqual(expected)
  })

  it('writes one pretty line when pretty is on', () => {
    capture()

    const logger = SimpleLogger.open({ clock, pretty: true })
    const child = logger.child({
      correlationId: ids.correlation,
      walletId: ids.wallet,
    })

    child.warn(text.message)

    const [line] = written
    const expected = `${instant.time.toISOString()} ${text.level} ${text.message} correlationId=${ids.correlation} walletId=${ids.wallet}${text.line}`

    expect(line).toBe(expected)
  })

  it('leaves out an absent identifier', () => {
    capture()

    const logger = SimpleLogger.open({ clock, pretty: true })
    const child = logger.child({
      correlationId: ids.correlation,
      walletId: undefined,
    })

    child.warn(text.message)

    const [line] = written

    expect(line).toContain(`correlationId=${ids.correlation}`)
    expect(line).not.toContain('walletId')
  })

  it('does not change the parent context', () => {
    capture()

    const logger = SimpleLogger.open({ clock, pretty: false })
    const child = logger.child({
      messageId: ids.message,
      transactionId: ids.transaction,
      providerId: ids.provider,
    })

    child.warn(text.message)
    logger.warn(text.message)

    const [childLine, parentLine] = written
    const childOutput = JSON.parse(String(childLine))
    const parentOutput = JSON.parse(String(parentLine))

    expect(childOutput.messageId).toBe(ids.message)
    expect(parentOutput.messageId).toBeUndefined()
  })
})
