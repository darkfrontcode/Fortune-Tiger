import { Catch, Inject, Injectable } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { LoggerProtocol } from '@application/observability'
import { LOGGER } from '@application/observability'
import type { HttpType } from '../types'
import { FailureHandler, ProviderIdentityHandler, HttpExceptionHandler, NotFoundHandler, ReconciliationNotFoundHandler, ConflictHandler, ReadinessHandler, FallbackHandler } from '../failures'

@Injectable()
@Catch()
export class HttpFailureFilter implements ExceptionFilter {
  private readonly chain: FailureHandler

  constructor(@Inject(LOGGER) private readonly logger: LoggerProtocol) {
    const head = new HttpExceptionHandler()

    head
      .link(new ProviderIdentityHandler())
      .link(new NotFoundHandler())
      .link(new ReconciliationNotFoundHandler())
      .link(new ConflictHandler())
      .link(new ReadinessHandler())
      .link(new FallbackHandler(this.logger))

    this.chain = head
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpType.Response>()

    this.chain.handle(exception, response)
  }
}
