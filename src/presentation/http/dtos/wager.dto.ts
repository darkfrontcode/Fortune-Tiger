import { IsIn, IsOptional, IsString, IsNotEmpty, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { WagerTransactionKind } from '../../../domain/wager/enums'
import { MoneyDto } from './money.dto'

const kinds = Object.values(WagerTransactionKind)

export class WagerDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string

  @IsString()
  @IsNotEmpty()
  externalTransactionId!: string

  @IsString()
  @IsNotEmpty()
  playerId!: string

  @IsString()
  @IsNotEmpty()
  walletId!: string

  @IsString()
  @IsNotEmpty()
  roundId!: string

  @IsString()
  @IsNotEmpty()
  gameId!: string

  @IsString()
  @IsIn(kinds)
  kind!: string

  @ValidateNested()
  @Type(() => MoneyDto)
  money!: MoneyDto

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenceExternalTransactionId?: string
}