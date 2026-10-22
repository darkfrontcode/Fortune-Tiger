import { defineConfig } from '@mikro-orm/postgresql'
import { InboxMessageEntity } from '@infrastructure/persistence/inbox/inbox-message.entity'
import { WalletLedgerEntity } from '@infrastructure/persistence/ledger/wallet-ledger.entity'
import { OutboxMessageEntity } from '@infrastructure/persistence/outbox/outbox-message.entity'
import { WagerTransactionEntity } from '@infrastructure/persistence/wager/wager-transaction.entity'
import { WalletEntity } from '@infrastructure/persistence/wallet/wallet.entity'

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [
    WalletEntity,
    WalletLedgerEntity,
    WagerTransactionEntity,
    InboxMessageEntity,
    OutboxMessageEntity,
  ],
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
