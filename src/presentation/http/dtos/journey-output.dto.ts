import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { JourneyOutcome, JourneyStage } from '@application/journeys'

export class JourneyStepOutputDto {
  @ApiProperty({ format: 'uuid' })
  stepId!: string

  @ApiProperty({ example: 'provider-a:transaction-1' })
  flowId!: string

  @ApiProperty({ enum: JourneyStage, example: JourneyStage.ROUTE })
  stage!: JourneyStage

  @ApiProperty({ example: 'SubmitWagerUseCase' })
  operation!: string

  @ApiProperty({ enum: JourneyOutcome, example: JourneyOutcome.SUCCEEDED })
  outcome!: JourneyOutcome

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date

  @ApiProperty({ example: 12 })
  durationMs!: number

  @ApiPropertyOptional({ example: 'fortune-tiger' })
  providerId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  playerId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  wagerId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  walletId?: string

  @ApiPropertyOptional({ example: 'INSUFFICIENT_FUNDS' })
  failureCode?: string
}

export class JourneyTimelineOutputDto {
  @ApiProperty({ type: [JourneyStepOutputDto] })
  items!: JourneyStepOutputDto[]
}