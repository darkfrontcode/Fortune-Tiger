import { defineConfig } from '@mikro-orm/postgresql'
import { InboxMessageEntity } from './src/infrastructure/persistence/inbox/inbox-message.entity'
import { WalletLedgerEntity } from './src/infrastructure/persistence/ledger/wallet-ledger.entity'
import { WagerTransactionEntity } from './src/infrastructure/persistence/wager/wager-transaction.entity'
import { WalletEntity } from './src/infrastructure/persistence/wallet/wallet.entity'

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [WalletEntity, WalletLedgerEntity, WagerTransactionEntity, InboxMessageEntity],
  migrations: {
    path: './src/infrastructure/persistence/migrations',
    pathTs: './src/infrastructure/persistence/migrations',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
  },
  discovery: {
    disableDynamicFileAccess: true,
  },
})
