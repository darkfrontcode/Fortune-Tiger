import { IsString, Matches } from 'class-validator'

const amountPattern = /^\d+\.\d{2}$/
const currencyPattern = /^[A-Z]{3}$/

export class MoneyDto {
  @IsString()
  @Matches(amountPattern, { message: 'Amount must be a decimal with exactly 2 places' })
  amount!: string

  @IsString()
  @Matches(currencyPattern, { message: 'Currency must be uppercase ISO-4217' })
  currency!: string
}