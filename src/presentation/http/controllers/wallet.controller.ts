import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import {
  FindWalletUseCase,
  ListWalletLedgerUseCase,
  OpenWalletUseCase,
} from '@application/wallets/use-cases'
import { ReconcileWalletUseCase } from '@application/reconciliations/use-cases'
import type { ReconciliationsType } from '@application/reconciliations'
import type { Ledger } from '@domain/ledger/ledger'
import { walletTag } from '../data'
import { LedgerOutputPageDto, ReconciliationOutputDto, WalletDto, WalletOutputDto } from '../dtos'
import { JourneyInterceptor } from '../interceptors'
import { WalletDtoMapper, LedgerOutputMapper, WalletOutputMapper } from '../mappers'
import { LedgerQuery } from '../queries'
import type { HttpType } from '../types'

type CompareOutput = ReconciliationsType.CompareOutput

const openingPrefix = 'opening'
const separator = ':'

@ApiTags(walletTag)
@Controller('wallets')
@UseInterceptors(JourneyInterceptor)
export class WalletController {
  private readonly dtoMapper = new WalletDtoMapper()
  private readonly query = new LedgerQuery()
  private readonly walletMapper = new WalletOutputMapper()
  private readonly ledgerMapper = new LedgerOutputMapper()

  constructor(
    private readonly openWallet: OpenWalletUseCase,
    private readonly findWallet: FindWalletUseCase,
    private readonly listWalletLedger: ListWalletLedgerUseCase,
    private readonly reconcileWallet: ReconcileWalletUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Open a wallet' })
  @ApiCreatedResponse({
    type: WalletOutputDto,
    description: 'Wallet created. An initial balance above zero writes the OPENING transaction and its CREDIT entry.',
  })
  @ApiBadRequestResponse({ description: 'The payload does not fit the DTO.' })
  @ApiConflictResponse({ description: 'A wallet already exists for this player and currency.' })
  async open(
    @Body() dto: WalletDto,
    @Req() request: HttpType.Request,
  ): Promise<HttpType.WalletOutput> {
    const input = this.dtoMapper.map(dto)
    request.flowId = `${openingPrefix}${separator}${input.id}`
    const wallet = await this.openWallet.execute(input)

    return this.walletMapper.map(wallet)
  }

  @Get(':walletId')
  @ApiOperation({ summary: 'Read a wallet' })
  @ApiParam({ name: 'walletId', format: 'uuid' })
  @ApiOkResponse({ type: WalletOutputDto })
  @ApiNotFoundResponse({ description: 'No wallet with this identifier.' })
  async find(@Param('walletId') walletId: string): Promise<HttpType.WalletOutput> {
    const wallet = await this.findWallet.execute({ walletId })
    return this.walletMapper.map(wallet)
  }

  @Get(':walletId/ledger')
  @ApiOperation({ summary: 'Page the ledger of a wallet' })
  @ApiParam({ name: 'walletId', format: 'uuid' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'The base64url of the last id of the previous page.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 50,
    description: 'Between 1 and 100. Defaults to 50.',
  })
  @ApiOkResponse({ type: LedgerOutputPageDto })
  @ApiBadRequestResponse({ description: 'Invalid cursor or limit.' })
  @ApiNotFoundResponse({ description: 'No wallet with this identifier.' })
  async page(
    @Param('walletId') walletId: string,
    @Query() query: HttpType.Query,
  ): Promise<HttpType.LedgerOutputPage> {
    const parsed = this.query.read(query)
    const input = { walletId, cursor: parsed.cursor, limit: parsed.limit }
    const page = await this.listWalletLedger.execute(input)
    const toOutput = (item: Ledger) => this.ledgerMapper.map(item)
    const items = page.items.map(toOutput)

    return { items, nextCursor: page.nextCursor }
  }

  @Post(':walletId/reconciliation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare a wallet with its ledger' })
  @ApiParam({ name: 'walletId', format: 'uuid' })
  @ApiOkResponse({ type: ReconciliationOutputDto, description: 'The comparison. A divergence is reported, never repaired.' })
  @ApiNotFoundResponse({ description: 'No wallet with this identifier.' })
  async reconcile(@Param('walletId') walletId: string): Promise<CompareOutput> {
    return this.reconcileWallet.execute({ walletId })
  }
}
