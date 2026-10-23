import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LedgerDirection } from '@domain/ledger/enums'
import { MoneyDto } from './money.dto'

export class LedgerOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  transactionId!: string

  @ApiProperty({ enum: LedgerDirection })
  direction!: LedgerDirection

  @ApiProperty({ type: MoneyDto })
  amount!: MoneyDto

  @ApiProperty({ type: MoneyDto })
  balanceBefore!: MoneyDto

  @ApiProperty({ type: MoneyDto })
  balanceAfter!: MoneyDto

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date
}

export class LedgerOutputPageDto {
  @ApiProperty({ type: [LedgerOutputDto] })
  items!: LedgerOutputDto[]

  @ApiPropertyOptional({ description: 'Absent on the last page.' })
  nextCursor?: string
}
