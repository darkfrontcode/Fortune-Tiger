import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AuditActorDto {
  @ApiProperty({ example: 'provider' })
  type!: string

  @ApiProperty({ example: 'provider-a' })
  id!: string
}

export class AuditEventOutputDto {
  @ApiProperty({ format: 'uuid' })
  eventId!: string

  @ApiProperty({ example: 'WagerTransactionProcessed' })
  eventType!: string

  @ApiProperty({ example: 1 })
  eventVersion!: number

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date

  @ApiProperty({ type: String, format: 'date-time' })
  recordedAt!: Date

  @ApiPropertyOptional({ format: 'uuid' })
  wagerId?: string

  @ApiProperty({ example: 'provider-a:transaction-1' })
  correlationId!: string

  @ApiPropertyOptional({ format: 'uuid' })
  causationId?: string

  @ApiProperty({ example: 'fortune-tiger' })
  source!: string

  @ApiPropertyOptional({ type: AuditActorDto })
  actor?: AuditActorDto

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { status: 'PROCESSED' },
  })
  metadata!: Record<string, string>
}

export class AuditTimelineOutputDto {
  @ApiProperty({ type: [AuditEventOutputDto] })
  items!: AuditEventOutputDto[]
}
