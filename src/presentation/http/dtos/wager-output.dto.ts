import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import { MoneyDto } from './money.dto'

export class WagerSubmitOutputDto {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string

  @ApiProperty({ enum: WagerTransactionStatus })
  status!: WagerTransactionStatus

  @ApiProperty({ type: MoneyDto, description: 'Balance observed when the wager was processed.' })
  balance!: MoneyDto

  @ApiProperty({ example: false, description: 'True when the same key and payload returned the original result.' })
  idempotentReplay!: boolean

  @ApiPropertyOptional({ enum: FailureCode })
  failureCode?: FailureCode
}

export class WagerOutputDto {
  @ApiProperty({ format: 'uuid' })
  transactionId!: string

  @ApiProperty({ example: 'provider-a' })
  providerId!: string

  @ApiProperty({ example: 'transaction-bet-1' })
  externalTransactionId!: string

  @ApiProperty({ format: 'uuid' })
  playerId!: string

  @ApiProperty({ format: 'uuid' })
  walletId!: string

  @ApiProperty({ example: 'round-1' })
  roundId!: string

  @ApiProperty({ example: 'fortune-tiger' })
  gameId!: string

  @ApiProperty({ enum: WagerTransactionKind })
  kind!: WagerTransactionKind

  @ApiProperty({ enum: WagerTransactionStatus })
  status!: WagerTransactionStatus

  @ApiProperty({ type: MoneyDto })
  money!: MoneyDto

  @ApiPropertyOptional({ enum: FailureCode })
  failureCode?: FailureCode

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date
}
