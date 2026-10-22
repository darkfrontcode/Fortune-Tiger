import { Module } from '@nestjs/common'
import { PersistenceModule } from '../../infrastructure/persistence'
import { WAGER_GATEWAY } from '../tokens'
import type { WagerGatewayProtocol } from '../protocols'
import { WagerService } from './wager'

const createWagerService = (gateway: WagerGatewayProtocol) => new WagerService(gateway)

@Module({
  imports: [PersistenceModule],
  providers: [{ provide: WagerService, useFactory: createWagerService, inject: [WAGER_GATEWAY] }],
  exports: [WagerService],
})
export class TransactionsModule {}
