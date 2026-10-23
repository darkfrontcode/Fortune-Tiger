import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'

const amountPattern = /^\d+\.\d{2}$/
const currencyPattern = /^[A-Z]{3}$/

export class MoneyDto {
  @ApiProperty({ example: '30.00', description: 'Decimal string with exactly two places.' })
  @IsString()
  @Matches(amountPattern, { message: 'Amount must be a decimal with exactly 2 places' })
  amount!: string

  @ApiProperty({ example: 'BRL', description: 'Uppercase ISO-4217 currency code.' })
  @IsString()
  @Matches(currencyPattern, { message: 'Currency must be uppercase ISO-4217' })
  currency!: string
}
