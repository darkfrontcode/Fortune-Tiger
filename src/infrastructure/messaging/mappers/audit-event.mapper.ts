import { Injectable } from '@nestjs/common'
import type { AuditType } from '@application/audits'
import { AuditEventGuard } from '../messages'
import type { MapperProtocol } from './mapper.protocol'

type Input = {
  body: string
  recordedAt: Date
}

type Output = AuditType.Event

@Injectable()
export class AuditEventMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const { body, recordedAt } = input

    return AuditEventGuard.from(body, recordedAt)
  }
}
