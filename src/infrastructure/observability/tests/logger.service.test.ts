import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import type { ClockProtocol } from '@application/time'
import { LoggerService } from '../logger.service'
import { SimpleLogger } from '../simple-logger'

const instant = new Date('2026-01-01T00:00:00.000Z')
const message = 'Nest application successfully started'
const name = 'FortuneTiger'
const line = '\n'
const EMPTY_NUMBER = 0

class FixedClock implements ClockProtocol {
  now(): Date {
    return instant
  }
}

describe('LoggerService', () => {
  const clock = new FixedClock()
  const written: string[] = []

  const capture = () => {
    const writer = spyOn(process.stdout, 'write')

    writer.mockImplementation((chunk) => {
      written.push(String(chunk))

      return true
    })
  }

  const takeLine = (write: (service: LoggerService) => void): string => {
    const service = new LoggerService(SimpleLogger.open({ clock, pretty: true }))

    write(service)

    const [output] = written

    return String(output)
  }

  const lineFor = (level: string, icon: string): string => {
    return `${instant.toISOString()} ${level} [${name}]: ${icon} ${message}${line}`
  }

  beforeEach(() => {
    written.length = EMPTY_NUMBER

    capture()
  })

  afterEach(() => {
    mock.restore()
  })

  test('log - WHEN Nest logs a line SHOULD write the talk emoji at INFO', () => {
    const write = (service: LoggerService): void => { service.log(message) }

    expect(takeLine(write)).toBe(lineFor('INFO', '💬'))
  })

  test('error - WHEN Nest logs an error SHOULD write the cross emoji at ERROR', () => {
    const write = (service: LoggerService): void => { service.error(message) }

    expect(takeLine(write)).toBe(lineFor('ERROR', '❌'))
  })

  test('warn - WHEN Nest warns SHOULD write the warning emoji at WARN', () => {
    const write = (service: LoggerService): void => { service.warn(message) }

    expect(takeLine(write)).toBe(lineFor('WARN', '⚠️'))
  })

  test('debug - WHEN Nest debugs SHOULD write the bug emoji at DEBUG', () => {
    const write = (service: LoggerService): void => { service.debug(message) }

    expect(takeLine(write)).toBe(lineFor('DEBUG', '🐞'))
  })

  test('verbose - WHEN Nest writes a detail SHOULD write the search emoji at VERBOSE', () => {
    const write = (service: LoggerService): void => { service.verbose(message) }

    expect(takeLine(write)).toBe(lineFor('VERBOSE', '🔎'))
  })

  test('fatal - WHEN Nest fails hard SHOULD write the skull emoji at FATAL', () => {
    const write = (service: LoggerService): void => { service.fatal(message) }

    expect(takeLine(write)).toBe(lineFor('FATAL', '💀'))
  })
})
