import { ApiProperty } from '@nestjs/swagger'
import { MoneyDto } from './money.dto'

export class WalletOutputDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  playerId!: string

  @ApiProperty({ type: MoneyDto })
  balance!: MoneyDto

  @ApiProperty({ example: 2, description: 'Increases only when the balance changes.' })
  version!: number
}
