import { IsString, IsNotEmpty, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { MoneyDto } from './money.dto'

export class WalletDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string

  @ValidateNested()
  @Type(() => MoneyDto)
  initialBalance!: MoneyDto
}