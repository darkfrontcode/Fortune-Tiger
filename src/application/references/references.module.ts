import { Module } from '@nestjs/common'
import { PersistenceModule } from '../../infrastructure/persistence'
import { REFERENCE_GATEWAY, REFERENCE_READER } from '../tokens'
import type { ReferenceGatewayProtocol, ReferenceReaderProtocol } from '../protocols'
import { ReferenceService } from './reference.service'

const createReferenceService = (reader: ReferenceReaderProtocol, gateway: ReferenceGatewayProtocol) =>
  new ReferenceService(reader, gateway)

@Module({
  imports: [PersistenceModule],
  providers: [
    { provide: ReferenceService, useFactory: createReferenceService, inject: [REFERENCE_READER, REFERENCE_GATEWAY] },
  ],
  exports: [ReferenceService],
})
export class ReferencesModule {}
