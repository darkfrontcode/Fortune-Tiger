import { ApiProperty } from '@nestjs/swagger'
import { MoneyDto } from './money.dto'

export class ReconciliationOutputDto {
  @ApiProperty({ format: 'uuid' })
  walletId!: string

  @ApiProperty({ type: MoneyDto })
  storedBalance!: MoneyDto

  @ApiProperty({ type: MoneyDto })
  calculatedBalance!: MoneyDto

  @ApiProperty({ type: MoneyDto })
  difference!: MoneyDto

  @ApiProperty({ example: true })
  consistent!: boolean

  @ApiProperty({ example: 2 })
  checkedEntries!: number
}
