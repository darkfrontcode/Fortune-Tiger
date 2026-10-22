import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import type {
  ClockProtocol,
  LedgerReaderProtocol,
  WalletOpeningProtocol,
  WalletReaderProtocol,
} from '@application/protocols'
import { ReconciliationService } from '@application/reconciliations'
import type { ReconciliationsType } from '@application/reconciliations'
import { CLOCK } from '@application/dependencies/tokens'
import { LEDGER_READER, WALLET_OPENING, WALLET_READER } from '@application/wallets/tokens'
import type { Ledger } from '@domain/ledger/ledger'
import { WALLET_NOT_FOUND_MESSAGE } from '../data'
import type { WalletDto } from '../dtos'
import { WalletDtoMapper, LedgerOutputMapper, WalletOutputMapper } from '../mappers'
import { LedgerQuery } from '../queries'
import type { HttpType } from '../types'

type CompareOutput = ReconciliationsType.CompareOutput

@Controller('wallets')
export class WalletController {
  private readonly dtoMapper = new WalletDtoMapper()
  private readonly query = new LedgerQuery()
  private readonly walletMapper = new WalletOutputMapper()
  private readonly ledgerMapper = new LedgerOutputMapper()

  constructor(
    @Inject(WALLET_READER) private readonly wallets: WalletReaderProtocol,
    @Inject(LEDGER_READER) private readonly ledger: LedgerReaderProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(WALLET_OPENING) private readonly opening: WalletOpeningProtocol,
    private readonly reconciliation: ReconciliationService,
  ) {}

  @Post()
  async open(@Body() dto: WalletDto): Promise<HttpType.WalletOutput> {
    const parsed = this.dtoMapper.map(dto)
    const openedAt = this.clock.now()
    const input = { ...parsed, openedAt }
    const wallet = await this.opening.open(input)

    return this.walletMapper.map(wallet)
  }

  @Get(':walletId')
  async find(@Param('walletId') walletId: string): Promise<HttpType.WalletOutput> {
    const wallet = await this.wallets.findById(walletId)
    const missing = wallet === undefined

    if (missing) { throw new HttpException(WALLET_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND) }

    return this.walletMapper.map(wallet)
  }

  @Get(':walletId/ledger')
  async page(
    @Param('walletId') walletId: string,
    @Query() query: HttpType.Query,
  ): Promise<HttpType.LedgerOutputPage> {
    const parsed = this.query.read(query)
    const wallet = await this.wallets.findById(walletId)
    const missing = wallet === undefined

    if (missing) { throw new HttpException(WALLET_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND) }

    const pageInput = { walletId, cursor: parsed.cursor, limit: parsed.limit }
    const page = await this.ledger.page(pageInput)
    const toOutput = (item: Ledger) => this.ledgerMapper.map(item)
    const items = page.items.map(toOutput)

    return { items, nextCursor: page.nextCursor }
  }

  @Post(':walletId/reconciliation')
  @HttpCode(HttpStatus.OK)
  async reconcile(@Param('walletId') walletId: string): Promise<CompareOutput> {
    const output = await this.reconciliation.reconcile(walletId)
    const missing = 'failureCode' in output

    if (missing) { throw new HttpException(output, HttpStatus.NOT_FOUND) }

    return output
  }
}