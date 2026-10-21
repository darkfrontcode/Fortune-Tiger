import { defineConfig } from '@mikro-orm/postgresql'
import { WalletEntity } from './src/infrastructure/persistence/wallet/wallet.entity'
import { WalletLedgerEntity } from './src/infrastructure/persistence/ledger/wallet-ledger.entity'

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [WalletEntity, WalletLedgerEntity],
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
