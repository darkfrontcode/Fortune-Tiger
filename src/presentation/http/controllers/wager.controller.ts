import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger'
import type { ClockProtocol } from '@application/time'
import {
  FindWagerByProviderUseCase,
  FindWagerUseCase,
  SubmitWagerUseCase,
} from '@application/wagers/use-cases'
import { CLOCK } from '@application/time'
import { AuthGuard } from '../guards'
import { IDEMPOTENCY_KEY_REQUIRED_MESSAGE, idempotencyHeader, providerHeader, wagerTag } from '../data'
import { WagerDto, WagerOutputDto, WagerSubmitOutputDto } from '../dtos'
import { WagerDtoMapper, WagerInputMapper, WagerOutputMapper, WagerSubmitMapper } from '../mappers'
import type { HttpType } from '../types'
import { WagerStatus } from '../statuses'

const empty = String()

@ApiTags(wagerTag)
@ApiHeader({
  name: providerHeader,
  required: false,
  description: 'Caller identity in the default `anonymous` auth mode.',
})
@ApiUnauthorizedResponse({ description: 'Missing, expired, or badly signed bearer token in the `jwt` auth mode.' })
@Controller()
@UseGuards(AuthGuard)
export class WagerController {
  private readonly dtoMapper = new WagerDtoMapper()
  private readonly inputMapper = new WagerInputMapper()
  private readonly submitMapper = new WagerSubmitMapper()
  private readonly outputMapper = new WagerOutputMapper()
  private readonly wagerStatus = new WagerStatus()

  constructor(
    private readonly submitWager: SubmitWagerUseCase,
    private readonly findWager: FindWagerUseCase,
    private readonly findWagerByProvider: FindWagerByProviderUseCase,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  @Post('wagering/transactions')
  @ApiOperation({ summary: 'Submit a wager' })
  @ApiHeader({
    name: idempotencyHeader,
    required: true,
    description: 'Source of truth for the duplicate check. Recommended shape: {providerId}:{externalTransactionId}.',
  })
  @ApiOkResponse({ type: WagerSubmitOutputDto, description: 'PROCESSED, a replay, or an already terminal REJECTED.' })
  @ApiAcceptedResponse({ type: WagerSubmitOutputDto, description: 'PENDING or PENDING_REFERENCE.' })
  @ApiUnprocessableEntityResponse({
    type: WagerSubmitOutputDto,
    description: 'A business rule refused the wager; the failureCode names it.',
  })
  @ApiConflictResponse({ type: WagerSubmitOutputDto, description: 'The same Idempotency-Key arrived with a different payload.' })
  @ApiBadRequestResponse({ description: 'Missing Idempotency-Key, or a payload that does not fit the DTO.' })
  @ApiServiceUnavailableResponse({ description: 'Transient infrastructure failure, or a FAILED wager.' })
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
    const output = await this.submitWager.execute(input)
    const status = this.wagerStatus.of(output)

    response.status(status)

    return this.submitMapper.map({ output, currency: parsed.money.currency })
  }

  @Get('wagering/transactions/:transactionId')
  @ApiOperation({ summary: 'Read a wager by transaction' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiOkResponse({ type: WagerOutputDto })
  @ApiNotFoundResponse({ description: 'No wager with this identifier.' })
  async find(@Param('transactionId') transactionId: string): Promise<HttpType.WagerOutput> {
    const wager = await this.findWager.execute({ transactionId })
    return this.outputMapper.map(wager)
  }

  @Get('providers/:providerId/wagering/transactions/:externalTransactionId')
  @ApiOperation({ summary: 'Read a wager by provider pair' })
  @ApiParam({ name: 'providerId', example: 'provider-a' })
  @ApiParam({ name: 'externalTransactionId', example: 'transaction-bet-1' })
  @ApiOkResponse({ type: WagerOutputDto })
  @ApiNotFoundResponse({ description: 'No wager for this provider and external transaction.' })
  async findByProvider(
    @Param('providerId') providerId: string,
    @Param('externalTransactionId') externalTransactionId: string,
  ): Promise<HttpType.WagerOutput> {
    const wager = await this.findWagerByProvider.execute({ providerId, externalTransactionId })
    return this.outputMapper.map(wager)
  }

  private readonly idempotencyKey = (key: string | undefined): string => {
    const missing = key === undefined || key === empty

    if (missing) { throw new BadRequestException(IDEMPOTENCY_KEY_REQUIRED_MESSAGE) }

    return key
  }
}
