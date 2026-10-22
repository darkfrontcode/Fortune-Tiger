import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { ClockProtocol, WagerReaderProtocol } from '@application/protocols'
import { WagerService } from '@application/transactions'
import { CLOCK, WAGER_READER } from '@application/tokens'
import { AuthGuard } from '../guards'
import { IDEMPOTENCY_KEY_REQUIRED_MESSAGE, WAGER_NOT_FOUND_MESSAGE } from '../data'
import type { WagerDto } from '../dtos'
import { WagerDtoMapper, WagerInputMapper, WagerOutputMapper, WagerSubmitMapper } from '../mappers'
import type { HttpType } from '../types'
import { WagerStatus } from '../statuses'

const empty = String()

@Controller()
@UseGuards(AuthGuard)
export class WagerController {
  private readonly dtoMapper = new WagerDtoMapper()
  private readonly inputMapper = new WagerInputMapper()
  private readonly submitMapper = new WagerSubmitMapper()
  private readonly outputMapper = new WagerOutputMapper()
  private readonly wagerStatus = new WagerStatus()

  constructor(
    private readonly wagers: WagerService,
    @Inject(WAGER_READER) private readonly reader: WagerReaderProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  @Post('wagering/transactions')
  async submit(
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: WagerDto,
    @Req() request: HttpType.Request,
    @Res({ passthrough: true }) response: HttpType.Response,
  ): Promise<HttpType.WagerSubmitOutput> {
    const idempotencyKey = this.idempotencyKey(key)
    const parsed = this.dtoMapper.map(dto)
    const at = this.clock.now()
    const providerId = request.provider.providerId
    const mapping = { body: parsed, providerId, idempotencyKey, at }
    const input = this.inputMapper.map(mapping)
    const output = await this.wagers.submit(input)
    const status = this.wagerStatus.of(output)

    response.status(status)

    return this.submitMapper.map({ output, currency: parsed.money.currency })
  }

  @Get('wagering/transactions/:transactionId')
  async find(@Param('transactionId') transactionId: string): Promise<HttpType.WagerOutput> {
    const wager = await this.reader.findById(transactionId)
    const missing = wager === undefined

    if (missing) { throw new HttpException(WAGER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND) }

    return this.outputMapper.map(wager)
  }

  @Get('providers/:providerId/wagering/transactions/:externalTransactionId')
  async findByProvider(
    @Param('providerId') providerId: string,
    @Param('externalTransactionId') externalTransactionId: string,
  ): Promise<HttpType.WagerOutput> {
    const wager = await this.reader.findByProviderAndExternal(providerId, externalTransactionId)
    const missing = wager === undefined

    if (missing) { throw new HttpException(WAGER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND) }

    return this.outputMapper.map(wager)
  }

  private readonly idempotencyKey = (key: string | undefined): string => {
    const missing = key === undefined || key === empty

    if (missing) { throw new BadRequestException(IDEMPOTENCY_KEY_REQUIRED_MESSAGE) }

    return key
  }
}