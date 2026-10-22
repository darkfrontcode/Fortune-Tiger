import { HttpStatus } from '@nestjs/common'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { LedgerDirection } from '@domain/ledger/enums'
import type { Ledger } from '@domain/ledger/ledger'
import { WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { PersistenceHarness } from './persistence.harness'
import { WalletRepository } from '../wallet/wallet.repository'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'

type Wallet = {
  id: string
  playerId: string
  balance: {
    amount: string
    currency: string
  }
  version: number
}

type Money = {
  amount: string
  currency: string
}

type Wager = {
  providerId: string
  externalTransactionId: string
  playerId: string
  walletId: string
  roundId: string
  gameId: string
  kind: WagerTransactionKind
  money: Money
}

type Output = {
  transactionId: string
  status: WagerTransactionStatus
  idempotentReplay: boolean
}

type Process = ReturnType<typeof Bun.spawn>
type Server = ReturnType<typeof Bun.serve>

const processCount = 3
const duplicateCount = 50
const startupTimeout = 60_000
const shutdownTimeout = 60_000
const testTimeout = 120_000
const pollInterval = 100
const one = 1
const successfulExitCode = 0
const empty = String()
const ephemeralPort = 0
const host = '127.0.0.1'
const scheme = 'http://'
const method = 'POST'
const terminationSignal = 'SIGTERM'
const command = {
  run: 'run',
  script: 'src/main.ts',
  pretty: 'false',
}
const mediaType = 'application/json'
const jsonHeader = 'content-type'
const idempotencyHeader = 'idempotency-key'
const route = {
  health: '/health/live',
  wallets: '/wallets',
  wagers: '/wagering/transactions',
}
const currency = {
  brl: 'BRL',
}
const amount = {
  opening: '100.00',
  wager: '1.00',
  remaining: '99.00',
  raceWager: '80.00',
  raceRemaining: '20.00',
}
const provider = {
  id: 'race-test-provider',
}
const game = {
  id: 'fortune-tiger',
}
const separator = ':'
const messages = {
  applicationStopped: 'An application process exited before becoming ready',
  applicationShutdown: 'An application process failed to shut down',
  applicationTimeout: 'An application process did not become ready at',
  walletOpen: 'Wallet creation returned an unexpected HTTP status',
  walletMissing: 'Wallet was not found after its requests completed',
  wagerMissing: 'Wager was not found after its requests completed',
  ledgerMissing: 'Ledger entry was not found after its requests completed',
}
const scenario = {
  suite: 'Application races',
  duplicate: 'WHEN one wager is submitted 50 times across three application processes SHOULD create one debit',
  balance: 'WHEN two wagers of 80 race on a balance of 100 across processes SHOULD process one and reject one',
  wallets: 'WHEN wagers for distinct wallets run in parallel across three processes SHOULD process each independently',
}

const headers = {
  [jsonHeader]: mediaType,
}

class RaceSuite {
  private orm: MikroORM | undefined
  private readonly ports: Array<number> = []
  private readonly processes: Array<Process> = []
  private failure = empty
  private readonly respond = () => new Response()
  private readonly reserve = (): Server => Bun.serve({
    hostname: host,
    port: ephemeralPort,
    fetch: this.respond,
  })
  private readonly port = (server: Server): number => {
    const port = server.port

    if (port === undefined) { throw new Error(messages.applicationStopped) }

    return port
  }
  private readonly release = (server: Server): void => {
    server.stop(true)
  }
  private readonly launch = (port: number): Process => Bun.spawn(
    [process.execPath, command.run, command.script],
    {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), LOG_PRETTY: command.pretty },
      stdout: 'ignore',
      stderr: 'inherit',
    },
  )
  private readonly address = (port: number): string => `${scheme}${host}:${port}`
  private readonly stopped = (child: Process): boolean => child.exitCode !== null
  private readonly response = async (url: string): Promise<boolean> => {
    try {
      const result = await fetch(url)
      const ready = result.status === HttpStatus.OK

      if (ready) {
        this.failure = empty
        return true
      }

      this.failure = String(result.status)
      return false
    } catch (error) {
      this.failure = String(error)
      return false
    }
  }
  private readonly wait = async (port: number, deadline: number): Promise<void> => {
    const child = this.processes.find(this.stopped)

    if (child !== undefined) {
      throw new Error(`${messages.applicationStopped}: ${child.exitCode}`)
    }

    const address = this.address(port)
    const url = `${address}${route.health}`
    const ready = await this.response(url)

    if (ready) { return }

    const expired = Date.now() >= deadline

    if (expired) {
      throw new Error(`${messages.applicationTimeout} ${url}: ${this.failure}`)
    }

    await Bun.sleep(pollInterval)
    return this.wait(port, deadline)
  }
  private readonly stop = async (child: Process): Promise<void> => {
    const terminated = child.exitCode === null

    if (terminated) { child.kill(terminationSignal) }

    const status = await child.exited
    const failed = !terminated && status !== successfulExitCode

    if (failed) { throw new Error(`${messages.applicationShutdown}: ${status}`) }
  }
  status(response: Response): number {
    return response.status
  }

  replay(output: Output): boolean {
    return output.idempotentReplay
  }

  transactionId(output: Output): string {
    return output.transactionId
  }

  private readonly persistence = (): MikroORM => {
    const orm = this.orm

    if (orm === undefined) { throw new Error(messages.applicationStopped) }

    return orm
  }

  async open(): Promise<void> {
    this.orm = await PersistenceHarness.open()

    const servers = Array.from({ length: processCount }, this.reserve)
    const ports = servers.map(this.port)

    servers.forEach(this.release)
    this.ports.push(...ports)

    const processes = ports.map(this.launch)

    this.processes.push(...processes)

    const deadline = Date.now() + startupTimeout
    const toWait = (port: number) => this.wait(port, deadline)

    await Promise.all(ports.map(toWait))
  }

  async reset(): Promise<void> {
    const orm = this.persistence()

    await PersistenceHarness.reset(orm)
  }

  async close(): Promise<void> {
    await Promise.all(this.processes.map(this.stop))
    const orm = this.orm

    if (orm === undefined) { return }

    await PersistenceHarness.close(orm)
    this.orm = undefined
  }

  addresses(): Array<string> {
    return this.ports.map(this.address)
  }

  endpoint(index: number): string {
    const port = this.ports[index]

    if (port === undefined) { throw new Error(messages.applicationStopped) }

    return this.address(port)
  }

  async openWallet(address: string, playerId: string): Promise<Wallet> {
    const initialBalance = { amount: amount.opening, currency: currency.brl }
    const body = JSON.stringify({ playerId, initialBalance })
    const url = `${address}${route.wallets}`
    const response = await fetch(url, { method, headers, body })
    const created = response.status === HttpStatus.CREATED

    if (!created) {
      throw new Error(`${messages.walletOpen}: ${response.status}`)
    }

    const wallet: Wallet = await response.json()

    return wallet
  }

  wager(
    wallet: Wallet,
    externalTransactionId: string,
    wagerAmount: string = amount.wager,
  ): Wager {
    return {
      providerId: provider.id,
      externalTransactionId,
      playerId: wallet.playerId,
      walletId: wallet.id,
      roundId: uuidv7(),
      gameId: game.id,
      kind: WagerTransactionKind.BET,
      money: { amount: wagerAmount, currency: currency.brl },
    }
  }

  key(externalTransactionId: string): string {
    return `${provider.id}${separator}${externalTransactionId}`
  }

  async submit(address: string, wager: Wager, key: string): Promise<Response> {
    const url = `${address}${route.wagers}`
    const body = JSON.stringify(wager)
    const requestHeaders = { ...headers, [idempotencyHeader]: key }

    return fetch(url, { method, headers: requestHeaders, body })
  }

  async output(response: Response): Promise<Output> {
    const output: Output = await response.json()

    return output
  }

  async wallet(id: string) {
    const orm = this.persistence()
    const manager = orm.em.fork()
    const wallets = new WalletRepository(manager)

    return wallets.findById(id)
  }

  async ledgers(id: string) {
    const orm = this.persistence()
    const manager = orm.em.fork()
    const ledger = new WalletLedgerRepository(manager)

    return ledger.listByWalletId(id)
  }

  async stored(providerId: string, externalTransactionId: string) {
    const orm = this.persistence()
    const manager = orm.em.fork()
    const wagers = new WagerTransactionRepository(manager)

    return wagers.findByProviderAndExternal(providerId, externalTransactionId)
  }
}

const suite = new RaceSuite()

beforeAll(async () => suite.open(), startupTimeout)
beforeEach(async () => suite.reset())
afterAll(async () => suite.close(), shutdownTimeout)

describe(scenario.suite, () => {
  test(scenario.duplicate, async () => {
    const playerId = uuidv7()
    const wallet = await suite.openWallet(suite.endpoint(0), playerId)
    const externalTransactionId = uuidv7()
    const wager = suite.wager(wallet, externalTransactionId)
    const key = suite.key(externalTransactionId)
    const indexes = [...new Array(duplicateCount).keys()]
    const toSubmit = (index: number) =>
      suite.submit(suite.endpoint(index % processCount), wager, key)
    const responses = await Promise.all(indexes.map(toSubmit))
    const outputs = await Promise.all(responses.map(suite.output))
    const statuses = responses.map(suite.status)
    const replays = outputs.filter(suite.replay)
    const transactionIds = new Set(outputs.map(suite.transactionId))
    const toStatus = (output: Output) => output.status
    const wagerStatuses = outputs.map(toStatus)
    const stored = await suite.stored(provider.id, externalTransactionId)
    const balance = await suite.wallet(wallet.id)
    const ledgers = await suite.ledgers(wallet.id)
    const debits = ledgers.filter((ledger) => ledger.direction === LedgerDirection.DEBIT)
    const debit = debits[0]
    const replayCount = duplicateCount - one

    expect(statuses).toEqual(new Array(duplicateCount).fill(HttpStatus.OK))
    expect(wagerStatuses).toEqual(
      new Array(duplicateCount).fill(WagerTransactionStatus.PROCESSED),
    )
    expect(replays).toHaveLength(replayCount)
    expect(transactionIds.size).toBe(one)

    if (stored === undefined) { throw new Error(messages.wagerMissing) }
    if (balance === undefined) { throw new Error(messages.walletMissing) }
    if (debit === undefined) { throw new Error(messages.ledgerMissing) }

    expect(transactionIds.has(stored.id)).toBe(true)
    expect(stored.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(balance.balance.amount).toBe(amount.remaining)
    expect(debits).toHaveLength(one)
    expect(debit.money.amount).toBe(amount.wager)
  }, testTimeout)

  test(scenario.balance, async () => {
    const wallet = await suite.openWallet(suite.endpoint(0), uuidv7())
    const externalTransactionIds = [uuidv7(), uuidv7()]
    const toWager = (externalTransactionId: string) =>
      suite.wager(wallet, externalTransactionId, amount.raceWager)
    const wagers = externalTransactionIds.map(toWager)
    const toSubmit = (wager: Wager, index: number) =>
      suite.submit(suite.endpoint(index), wager, suite.key(wager.externalTransactionId))
    const responses = await Promise.all(wagers.map(toSubmit))
    const outputs = await Promise.all(responses.map(suite.output))
    const statuses = responses.map(suite.status)
    const toStatus = (output: Output) => output.status
    const wagerStatuses = outputs.map(toStatus)
    const byProcessed = (status: WagerTransactionStatus) =>
      status === WagerTransactionStatus.PROCESSED
    const byRejected = (status: WagerTransactionStatus) =>
      status === WagerTransactionStatus.REJECTED
    const processed = wagerStatuses.filter(byProcessed)
    const rejected = wagerStatuses.filter(byRejected)
    const bySuccessful = (status: number) => status === HttpStatus.OK
    const byUnprocessable = (status: number) => status === HttpStatus.UNPROCESSABLE_ENTITY
    const successfulResponses = statuses.filter(bySuccessful)
    const rejectedResponses = statuses.filter(byUnprocessable)
    const toStored = (wager: Wager) =>
      suite.stored(wager.providerId, wager.externalTransactionId)
    const stored = await Promise.all(wagers.map(toStored))
    const toStoredStatus = (wager: WagerTransaction | undefined) => {
      if (wager === undefined) { throw new Error(messages.wagerMissing) }

      return wager.status
    }
    const storedStatuses = stored.map(toStoredStatus)
    const balance = await suite.wallet(wallet.id)
    const ledgers = await suite.ledgers(wallet.id)
    const byDebit = (ledger: Ledger) => ledger.direction === LedgerDirection.DEBIT
    const debits = ledgers.filter(byDebit)
    const debit = debits[0]

    expect(successfulResponses).toHaveLength(one)
    expect(rejectedResponses).toHaveLength(one)
    expect(processed).toHaveLength(one)
    expect(rejected).toHaveLength(one)
    expect(storedStatuses).toEqual(wagerStatuses)

    if (balance === undefined) { throw new Error(messages.walletMissing) }
    if (debit === undefined) { throw new Error(messages.ledgerMissing) }

    expect(balance.balance.amount).toBe(amount.raceRemaining)
    expect(debits).toHaveLength(one)
    expect(debit.money.amount).toBe(amount.raceWager)
  }, testTimeout)

  test(scenario.wallets, async () => {
    const addresses = suite.addresses()
    const toWallet = (address: string) => suite.openWallet(address, uuidv7())
    const wallets = await Promise.all(addresses.map(toWallet))
    const wagers = wallets.map((wallet) => suite.wager(wallet, uuidv7()))
    const toSubmit = (wager: Wager, index: number) =>
      suite.submit(suite.endpoint(index), wager, suite.key(wager.externalTransactionId))
    const responses = await Promise.all(wagers.map(toSubmit))
    const outputs = await Promise.all(responses.map(suite.output))
    const toBalance = async (wallet: Wallet): Promise<string> => {
      const stored = await suite.wallet(wallet.id)

      if (stored === undefined) { throw new Error(messages.walletMissing) }

      return stored.balance.amount
    }
    const balances = await Promise.all(wallets.map(toBalance))
    const toLedgers = (wallet: Wallet) => suite.ledgers(wallet.id)
    const ledgers = await Promise.all(wallets.map(toLedgers))
    const toStored = (wager: Wager) =>
      suite.stored(wager.providerId, wager.externalTransactionId)
    const stored = await Promise.all(wagers.map(toStored))
    const statuses = responses.map(suite.status)
    const toStatus = (output: Output) => output.status
    const wagerStatuses = outputs.map(toStatus)
    const toStoredStatus = (wager: WagerTransaction | undefined) => {
      if (wager === undefined) { throw new Error(messages.wagerMissing) }

      return wager.status
    }
    const storedStatuses = stored.map(toStoredStatus)
    const toDebits = (walletLedgers: Array<Ledger>) => {
      const debits = walletLedgers.filter((ledger) => ledger.direction === LedgerDirection.DEBIT)

      return debits.length
    }
    const debitCounts = ledgers.map(toDebits)

    expect(statuses).toEqual(new Array(processCount).fill(HttpStatus.OK))
    expect(wagerStatuses).toEqual(new Array(processCount).fill(WagerTransactionStatus.PROCESSED))
    expect(balances).toEqual(new Array(processCount).fill(amount.remaining))
    expect(debitCounts).toEqual(new Array(processCount).fill(one))
    expect(storedStatuses).toEqual(new Array(processCount).fill(WagerTransactionStatus.PROCESSED))
  }, testTimeout)
})
