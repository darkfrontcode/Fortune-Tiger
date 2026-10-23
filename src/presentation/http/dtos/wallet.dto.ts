import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { MoneyDto } from './money.dto'

export class WalletDto {
  @ApiProperty({ format: 'uuid', description: 'Player that owns the wallet.' })
  @IsString()
  @IsNotEmpty()
  playerId!: string

  @ApiProperty({ type: MoneyDto, description: 'Opening balance. Zero opens a wallet without a credit.' })
  @ValidateNested()
  @Type(() => MoneyDto)
  initialBalance!: MoneyDto
}
