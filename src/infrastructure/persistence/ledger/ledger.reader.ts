import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { LedgerPage, LedgerPageInput, LedgerReaderProtocol } from '../../../application/protocols'
import type { Ledger } from '../../../domain/ledger/ledger'
import { WalletLedgerRepository } from './wallet-ledger.repository'

type Input = LedgerPageInput
type Output = LedgerPage

const encoding = 'base64url'
const cursorFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

@Injectable()
export class LedgerReader implements LedgerReaderProtocol {
  constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

  async page(input: Input): Promise<Output> {
    const after = this.decode(input.cursor)
    const manager = this.orm.em.fork()
    const ledger = new WalletLedgerRepository(manager)
    const query = { walletId: input.walletId, after, limit: input.limit + 1 }
    const rows = await ledger.pageByWalletId(query)
    const items = rows.slice(0, input.limit)
    const reached = rows.length > input.limit
    const cursor = this.cursor(items, reached)

    return { items, nextCursor: cursor }
  }

  private readonly cursor = (items: Array<Ledger>, reached: boolean): string | undefined => {
    if (!reached) { return undefined }

    const last = items[items.length - 1]

    if (last === undefined) { return undefined }

    return this.encode(last.id)
  }

  private readonly encode = (id: string): string => Buffer
    .from(id)
    .toString(encoding)

  private readonly decode = (cursor: string | undefined): string | undefined => {
    const absent = cursor === undefined

    if (absent) { return undefined }

    const id = Buffer.from(cursor, encoding).toString()
    const valid = cursorFormat.test(id)

    if (!valid) { return undefined }

    return id
  }
}
