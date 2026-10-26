import { Injectable } from '@nestjs/common'
import { SimpleLogger } from '../loggers'

const name = 'FortuneTiger'

const emoji = {
  debug: '🐞',
  error: '❌',
  fatal: '💀',
  log: '💬',
  verbose: '🔎',
  warn: '⚠️',
}

@Injectable()
export class LoggerService {
  constructor(private readonly logger: SimpleLogger) {}

  log(message: unknown): void {
    this.logger.log(this.line(emoji.log, message))
  }

  error(message: unknown): void {
    this.logger.error(this.line(emoji.error, message))
  }

  warn(message: unknown): void {
    this.logger.warn(this.line(emoji.warn, message))
  }

  debug(message: unknown): void {
    this.logger.debug(this.line(emoji.debug, message))
  }

  verbose(message: unknown): void {
    this.logger.verbose(this.line(emoji.verbose, message))
  }

  fatal(message: unknown): void {
    this.logger.fatal(this.line(emoji.fatal, message))
  }

  private readonly line = (icon: string, message: unknown): string => {
    return `[${name}]: ${icon} ${this.text(message)}`
  }

  private readonly text = (message: unknown): string => {
    const plain = typeof message === 'string'

    if (plain) { return message }

    return JSON.stringify(message)
  }
}
