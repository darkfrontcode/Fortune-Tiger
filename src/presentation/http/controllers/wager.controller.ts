import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
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
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger'
import type { ClockProtocol } from '@application/time'
import type { AuditType } from '@application/audits'
import { FindWagerAuditUseCase } from '@application/audits/use-cases'
import { FindJourneyUseCase, JourneyNotFoundError } from '@application/journeys'
import type { JourneyType } from '@application/journeys'
import {
  FindWagerByProviderUseCase,
  FindWagerUseCase,
  SubmitWagerUseCase,
} from '@application/wagers/use-cases'
import { WagerNotFoundError } from '@application/wagers/errors'
import { CLOCK } from '@application/time'
import { AuthGuard } from '../guards'
import { JourneyInterceptor } from '../interceptors'
import { IDEMPOTENCY_KEY_REQUIRED_MESSAGE, idempotencyHeader, providerHeader, wagerTag } from '../data'
import {
  AuditTimelineOutputDto,
  JourneyTimelineOutputDto,
  WagerDto,
  WagerOutputDto,
  WagerSubmitOutputDto,
} from '../dtos'
import {
  AuditOutputMapper,
  JourneyOutputMapper,
  WagerDtoMapper,
  WagerInputMapper,
  WagerOutputMapper,
  WagerSubmitMapper,
} from '../mappers'
import { AuditQuery, JourneyQuery } from '../queries'
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
@UseInterceptors(JourneyInterceptor)
export class WagerController {
  private readonly dtoMapper = new WagerDtoMapper()
  private readonly inputMapper = new WagerInputMapper()
  private readonly submitMapper = new WagerSubmitMapper()
  private readonly outputMapper = new WagerOutputMapper()
  private readonly auditQuery = new AuditQuery()
  private readonly auditMapper = new AuditOutputMapper()
  private readonly journeyQuery = new JourneyQuery()
  private readonly journeyMapper = new JourneyOutputMapper()
  private readonly wagerStatus = new WagerStatus()

  constructor(
    private readonly submitWager: SubmitWagerUseCase,
    private readonly findWager: FindWagerUseCase,
    private readonly findWagerByProvider: FindWagerByProviderUseCase,
    private readonly findWagerAudit: FindWagerAuditUseCase,
    private readonly findJourney: FindJourneyUseCase,
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
    const providerId = request.provider?.providerId ?? empty
    const mapping = { body: parsed, providerId, idempotencyKey, at }
    const input = this.inputMapper.map(mapping)

    request.flowId = idempotencyKey

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

  @Get('wagering/transactions/:transactionId/audit')
  @ApiOperation({ summary: 'Read the audit timeline of a wager' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: 'One event type, such as WagerTransactionProcessed.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO-8601 lower bound on occurredAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO-8601 upper bound on occurredAt.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Between 1 and 100. Defaults to 50.',
  })
  @ApiOkResponse({
    type: AuditTimelineOutputDto,
    description: 'The recorded events, ordered by occurredAt and then by eventId.',
  })
  @ApiBadRequestResponse({ description: 'Invalid eventType, from, to, or limit.' })
  @ApiNotFoundResponse({ description: 'No wager with this identifier for the caller provider.' })
  async audit(
    @Param('transactionId') transactionId: string,
    @Query() query: HttpType.Query,
    @Req() request: HttpType.Request,
  ): Promise<HttpType.AuditTimelineOutput> {
    const parsed = this.auditQuery.read(query)
    const wager = await this.findWager.execute({ transactionId })
    const foreign = wager.providerId !== (request.provider?.providerId ?? empty)

    if (foreign) { throw new WagerNotFoundError() }

    const input = { wagerId: transactionId, ...parsed }
    const timeline = await this.findWagerAudit.execute(input)
    const toOutput = (event: AuditType.Event) => this.auditMapper.map(event)
    const items = timeline.items.map(toOutput)

    return { items }
  }

  @Get('wagering/transactions/:transactionId/journey')
  @ApiOperation({ summary: 'Read the journey of a wager' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiQuery({
    name: 'stage',
    required: false,
    description: 'One stage, such as USE_CASE.',
  })
  @ApiQuery({
    name: 'outcome',
    required: false,
    description: 'One outcome, such as SUCCEEDED.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO-8601 lower bound on occurredAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO-8601 upper bound on occurredAt.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Between 1 and 100. Defaults to 50.',
  })
  @ApiOkResponse({
    type: JourneyTimelineOutputDto,
    description: 'The steps of the flow that produced the wager.',
  })
  @ApiBadRequestResponse({ description: 'Invalid stage, outcome, from, to, or limit.' })
  @ApiNotFoundResponse({ description: 'No wager with this identifier for the caller provider.' })
  async journey(
    @Param('transactionId') transactionId: string,
    @Query() query: HttpType.Query,
    @Req() request: HttpType.Request,
  ): Promise<HttpType.JourneyTimelineOutput> {
    const parsed = this.journeyQuery.read(query)
    const wager = await this.findWager.execute({ transactionId })
    const foreign = wager.providerId !== (request.provider?.providerId ?? empty)

    if (foreign) { throw new WagerNotFoundError() }

    const providerId = request.provider?.providerId ?? empty
    const input = { flowId: wager.idempotencyKey, providerId, ...parsed }
    const timeline = await this.findJourney.execute(input)
    const toOutput = (step: JourneyType.Schema) => this.journeyMapper.map(step)
    const items = timeline.items.map(toOutput)

    return { items }
  }

  @Get('providers/:providerId/players/:playerId/journey')
  @ApiOperation({ summary: 'Read the journey of a player' })
  @ApiParam({ name: 'providerId', example: 'provider-a' })
  @ApiParam({ name: 'playerId', format: 'uuid' })
  @ApiQuery({
    name: 'stage',
    required: false,
    description: 'One stage, such as USE_CASE.',
  })
  @ApiQuery({
    name: 'outcome',
    required: false,
    description: 'One outcome, such as SUCCEEDED.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO-8601 lower bound on occurredAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO-8601 upper bound on occurredAt.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Between 1 and 100. Defaults to 50.',
  })
  @ApiOkResponse({
    type: JourneyTimelineOutputDto,
    description: 'The steps of the flows of the player, for the caller provider.',
  })
  @ApiBadRequestResponse({ description: 'Invalid stage, outcome, from, to, or limit.' })
  @ApiNotFoundResponse({ description: 'No journey for this caller and player.' })
  async playerJourney(
    @Param('providerId') providerId: string,
    @Param('playerId') playerId: string,
    @Query() query: HttpType.Query,
    @Req() request: HttpType.Request,
  ): Promise<HttpType.JourneyTimelineOutput> {
    const foreign = providerId !== (request.provider?.providerId ?? empty)

    if (foreign) { throw new JourneyNotFoundError() }

    const parsed = this.journeyQuery.read(query)
    const input = { playerId, providerId, ...parsed }
    const timeline = await this.findJourney.execute(input)
    const toOutput = (step: JourneyType.Schema) => this.journeyMapper.map(step)
    const items = timeline.items.map(toOutput)

    return { items }
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
