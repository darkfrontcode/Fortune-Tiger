import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import {
  FindWalletUseCase,
  ListWalletLedgerUseCase,
  OpenWalletUseCase,
} from '@application/wallets/use-cases'
import { ReconcileWalletUseCase } from '@application/reconciliations/use-cases'
import type { ReconciliationsType } from '@application/reconciliations'
import type { Ledger } from '@domain/ledger/ledger'
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
    private readonly openWallet: OpenWalletUseCase,
    private readonly findWallet: FindWalletUseCase,
    private readonly listWalletLedger: ListWalletLedgerUseCase,
    private readonly reconcileWallet: ReconcileWalletUseCase,
  ) {}

  @Post()
  async open(@Body() dto: WalletDto): Promise<HttpType.WalletOutput> {
    const input = this.dtoMapper.map(dto)
    const wallet = await this.openWallet.execute(input)

    return this.walletMapper.map(wallet)
  }

  @Get(':walletId')
  async find(@Param('walletId') walletId: string): Promise<HttpType.WalletOutput> {
    const wallet = await this.findWallet.execute({ walletId })
    return this.walletMapper.map(wallet)
  }

  @Get(':walletId/ledger')
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
  async reconcile(@Param('walletId') walletId: string): Promise<CompareOutput> {
    return this.reconcileWallet.execute({ walletId })
  }
}
