import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, IsNotEmpty, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { WagerTransactionKind } from '@domain/wager/enums'
import { MoneyDto } from './money.dto'

const kinds = Object.values(WagerTransactionKind)

export class WagerDto {
  @ApiProperty({ example: 'provider-a', description: 'Provider that owns the wager.' })
  @IsString()
  @IsNotEmpty()
  providerId!: string

  @ApiProperty({ example: 'transaction-bet-1', description: 'Provider transaction identifier.' })
  @IsString()
  @IsNotEmpty()
  externalTransactionId!: string

  @ApiProperty({ format: 'uuid', description: 'Player that owns the wallet.' })
  @IsString()
  @IsNotEmpty()
  playerId!: string

  @ApiProperty({ format: 'uuid', description: 'Wallet the wager applies to.' })
  @IsString()
  @IsNotEmpty()
  walletId!: string

  @ApiProperty({ example: 'round-1' })
  @IsString()
  @IsNotEmpty()
  roundId!: string

  @ApiProperty({ example: 'fortune-tiger' })
  @IsString()
  @IsNotEmpty()
  gameId!: string

  @ApiProperty({ enum: kinds, example: 'BET', description: '`OPENING` is internal and answers `422`.' })
  @IsString()
  @IsIn(kinds)
  kind!: string

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  money!: MoneyDto

  @ApiPropertyOptional({ description: 'Required for `REFUND` and `ROLLBACK`.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenceExternalTransactionId?: string
}
